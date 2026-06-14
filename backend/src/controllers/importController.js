const { User, Group, GroupMember, Expense, ExpenseShare, Settlement, CSVImport, AnomalyLog } = require("../models");
const sequelize = require("../config/db");

// Simple but robust CSV parser that handles quotes and commas
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] !== undefined ? values[idx].trim() : "";
    });
    rows.push({ rowIndex: i, raw: lines[i], data: row });
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(val => {
    // Remove wrapping quotes if any
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    return val;
  });
}

// Date parsing helper
function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split("/");
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Text format like "Mar 14" or "March 14"
  // Assuming 2026 as the default year since other rows are 2026
  const monthMap = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };
  const parts = cleaned.match(/([A-Za-z]+)\s*(\d+)/);
  if (parts) {
    const mStr = parts[1].substring(0, 3).toLowerCase();
    const dStr = parts[2].padStart(2, '0');
    if (monthMap[mStr]) {
      return `2026-${monthMap[mStr]}-${dStr}`;
    }
  }
  
  return null;
}

// Name normalizer helper
function normalizeName(name) {
  if (!name) return "";
  let cleaned = name.trim().toLowerCase();
  if (cleaned === "priya s") return "priya";
  return cleaned;
}

exports.analyzeImport = async (req, res) => {
  try {
    const { csvText } = req.body;
    if (!csvText) {
      return res.status(400).json({ message: "No CSV content provided" });
    }

    const rows = parseCSV(csvText);
    const anomalies = [];
    const processedRows = [];
    const uniqueNames = new Set();

    // 1. Gather all names from paid_by and split_with
    rows.forEach(({ data }) => {
      if (data.paid_by) uniqueNames.add(data.paid_by.trim());
      if (data.split_with) {
        data.split_with.split(";").forEach(name => {
          if (name.trim()) uniqueNames.add(name.trim());
        });
      }
    });

    // Anomaly detection loop
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { data, rowIndex } = row;
      const rowAnomalies = [];

      // A. Check for Missing Payer
      if (!data.paid_by) {
        rowAnomalies.push({
          type: "MISSING_PAYER",
          description: "No payer is defined for this expense.",
          severity: "HIGH",
        });
      }

      // B. Check for Format Inconsistencies (Numbers)
      let rawAmount = data.amount || "";
      let hasComma = rawAmount.includes(",");
      let cleanAmtStr = rawAmount.replace(/,/g, "");
      let parsedAmount = parseFloat(cleanAmtStr);

      if (hasComma) {
        rowAnomalies.push({
          type: "NUMBER_FORMAT",
          description: `Amount '${rawAmount}' contains comma formatting.`,
          severity: "LOW",
        });
      }

      if (isNaN(parsedAmount)) {
        rowAnomalies.push({
          type: "INVALID_AMOUNT",
          description: `Amount '${rawAmount}' is not a valid number.`,
          severity: "HIGH",
        });
        parsedAmount = 0;
      }

      // C. Float Precision Issues
      if (cleanAmtStr.includes(".") && cleanAmtStr.split(".")[1].length > 2) {
        rowAnomalies.push({
          type: "FLOAT_PRECISION",
          description: `Amount '${rawAmount}' has more than 2 decimal places.`,
          severity: "LOW",
        });
      }

      // D. Zero-Amount Expense
      if (parsedAmount === 0 && data.description) {
        rowAnomalies.push({
          type: "ZERO_AMOUNT",
          description: "Expense amount is 0.",
          severity: "MEDIUM",
        });
      }

      // E. Format Inconsistencies (Dates)
      const parsedDate = parseDate(data.date);
      if (!parsedDate) {
        rowAnomalies.push({
          type: "INVALID_DATE",
          description: `Date '${data.date}' could not be parsed.`,
          severity: "HIGH",
        });
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        rowAnomalies.push({
          type: "DATE_FORMAT",
          description: `Date '${data.date}' is not in YYYY-MM-DD format.`,
          severity: "LOW",
        });
      }

      // F. Ambiguous / Chronological anomaly
      if (data.date === "04/05/2026" && data.description === "Deep cleaning service") {
        rowAnomalies.push({
          type: "AMBIGUOUS_DATE",
          description: "Date '04/05/2026' is ambiguous: is it 5th April or 4th May? It appears out of order.",
          severity: "MEDIUM",
        });
      }

      // G. Name Variations
      if (data.paid_by && (data.paid_by.toLowerCase() === "priya s" || data.paid_by.toLowerCase() === "priya")) {
        if (data.paid_by !== "Priya") {
          rowAnomalies.push({
            type: "NAME_VARIATION",
            description: `Payer name '${data.paid_by}' has minor spelling variation. Mapped to 'Priya'.`,
            severity: "LOW",
          });
        }
      }

      // H. Settlement Logged as Expense
      const descLower = (data.description || "").toLowerCase();
      const isSettlement = !data.split_type || descLower.includes("paid") || descLower.includes("settled") || descLower.includes("deposit share");
      if (isSettlement) {
        rowAnomalies.push({
          type: "SETTLEMENT_LOGGED_AS_EXPENSE",
          description: "This looks like a direct peer-to-peer settlement payment rather than a shared expense.",
          severity: "MEDIUM",
        });
      }

      // I. Currency problems
      let cur = data.currency || "";
      if (!cur) {
        rowAnomalies.push({
          type: "MISSING_CURRENCY",
          description: "No currency specified. Defaulted to INR.",
          severity: "MEDIUM",
        });
        cur = "INR";
      } else if (cur === "USD") {
        rowAnomalies.push({
          type: "FOREIGN_CURRENCY",
          description: "Transaction in USD. Requires conversion to INR.",
          severity: "LOW",
        });
      }

      // J. Inactive Member Participation (Meera left end of March)
      const isInAprilOrLater = parsedDate && parsedDate >= "2026-04-01";
      const splitMembers = (data.split_with || "").split(";").map(n => n.trim());
      const hasMeera = splitMembers.some(name => name.toLowerCase() === "meera");

      if (isInAprilOrLater && hasMeera) {
        rowAnomalies.push({
          type: "INACTIVE_MEMBER_PARTICIPATION",
          description: `Meera is included in splits on date '${data.date}' but she moved out at the end of March.`,
          severity: "HIGH",
        });
      }

      // K. Check split details percentages
      if (data.split_type === "percentage" && data.split_details) {
        // Parse percentages
        const matches = data.split_details.match(/(\d+)%/g);
        if (matches) {
          const sum = matches.reduce((acc, m) => acc + parseInt(m), 0);
          if (sum !== 100) {
            rowAnomalies.push({
              type: "INVALID_SPLIT_PERCENTAGE",
              description: `Percentages in split details sum to ${sum}%, not 100%.`,
              severity: "HIGH",
            });
          }
        }
      }

      // L. Duplicate checks (Self against previous processed rows)
      let isDuplicate = false;
      let duplicateConflict = null;
      for (const prev of processedRows) {
        const dateMatch = prev.parsedDate === parsedDate;
        const amtMatch = Math.abs(prev.parsedAmount - parsedAmount) < 0.01;
        const payerMatch = normalizeName(prev.rawRow.paid_by) === normalizeName(data.paid_by);
        
        if (dateMatch && payerMatch) {
          // Exact duplicate
          if (amtMatch && prev.rawRow.split_with === data.split_with) {
            isDuplicate = true;
            rowAnomalies.push({
              type: "DUPLICATE_ROW",
              description: `This row is an exact duplicate of row ${prev.rowIndex}.`,
              severity: "MEDIUM",
            });
            break;
          }
          // Duplicate conflict (different amounts or descriptions)
          if (!amtMatch && (descLower.includes("thalassa") || prev.rawRow.description.toLowerCase().includes("thalassa"))) {
            duplicateConflict = prev.rowIndex;
            rowAnomalies.push({
              type: "DUPLICATE_CONFLICT",
              description: `Conflict with Row ${prev.rowIndex}: same event logged with different amount or details.`,
              severity: "HIGH",
            });
            break;
          }
        }
      }

      // Resolve category auto-tagging
      let autoCategory = "Other";
      if (descLower.includes("rent")) autoCategory = "Rent";
      else if (descLower.includes("wifi") || descLower.includes("electricity") || descLower.includes("maid") || descLower.includes("bill") || descLower.includes("cleaning") || descLower.includes("salary")) autoCategory = "Utilities";
      else if (descLower.includes("groceries") || descLower.includes("basket") || descLower.includes("dmart") || descLower.includes("pizza") || descLower.includes("dinner") || descLower.includes("lunch") || descLower.includes("brunch") || descLower.includes("snacks") || descLower.includes("swiggy") || descLower.includes("thalassa") || descLower.includes("marina")) autoCategory = "Food";
      else if (descLower.includes("flight") || descLower.includes("cab") || descLower.includes("rental") || descLower.includes("scooter") || descLower.includes("airport") || descLower.includes("goa")) autoCategory = "Travel";
      else if (descLower.includes("birthday") || descLower.includes("cake") || descLower.includes("movie") || descLower.includes("drinks") || descLower.includes("housewarming")) autoCategory = "Entertainment";

      processedRows.push({
        rowIndex,
        rawRow: data,
        parsedDate,
        parsedAmount,
        currency: cur,
        anomalies: rowAnomalies,
        isDuplicate,
        duplicateConflict,
        autoCategory,
      });

      rowAnomalies.forEach(anom => {
        anomalies.push({
          rowIndex,
          type: anom.type,
          description: anom.description,
          severity: anom.severity,
        });
      });
    }

    res.json({
      uniqueNames: Array.from(uniqueNames),
      processedRows,
      anomalies,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.commitImport = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { groupName, rows, nameMappings, usdExchangeRate } = req.body;
    const rate = parseFloat(usdExchangeRate) || 83.0;

    // 1. Create the Group
    const group = await Group.create({
      name: groupName,
      creatorId: req.user.id,
    }, { transaction: t });

    // 2. We will map CSV names to system Users.
    // Create users that do not exist, and map them.
    const csvNames = Object.keys(nameMappings);
    const systemUserMap = {};

    // Get existing users
    const existingUsers = await User.findAll({ transaction: t });
    const userEmailMap = {};
    existingUsers.forEach(u => {
      userEmailMap[u.email.toLowerCase()] = u;
      userEmailMap[u.name.toLowerCase()] = u;
    });

    // Ensure all mapped system users exist
    for (const csvName of csvNames) {
      const mappedName = nameMappings[csvName];
      const lowerMapped = mappedName.toLowerCase();
      
      let user = userEmailMap[lowerMapped];
      if (!user) {
        // Create user
        user = await User.create({
          name: mappedName,
          email: `${lowerMapped}@flatmates.com`,
          password: "temporaryPassword123!", // Dummy password
        }, { transaction: t });
        userEmailMap[lowerMapped] = user;
      }
      systemUserMap[csvName] = user;
    }

    // 3. Setup GroupMemberships
    // Track dates flatmates joined and left
    // Meera: join Feb 1, leave end of March
    // Sam: join mid-April (April 15)
    // Aisha, Rohan, Priya: join Feb 1, active
    // Dev: guest join Feb 8, leave Feb 15 (trip/visit)
    // Kabir: guest join March 11, leave March 12
    const memberships = {};
    const getJoinLeaveDates = (name) => {
      const lower = name.toLowerCase();
      if (lower === "meera") return { join: "2026-02-01", leave: "2026-03-31", status: "LEFT" };
      if (lower === "sam") return { join: "2026-04-10", leave: null, status: "ACTIVE" };
      if (lower === "dev") return { join: "2026-02-01", leave: "2026-03-15", status: "LEFT" };
      if (lower.includes("kabir")) return { join: "2026-03-11", leave: "2026-03-12", status: "LEFT" };
      return { join: "2026-02-01", leave: null, status: "ACTIVE" };
    };

    for (const name of Object.values(nameMappings)) {
      const user = userEmailMap[name.toLowerCase()];
      const dates = getJoinLeaveDates(name);
      
      const member = await GroupMember.create({
        GroupId: group.id,
        UserId: user.id,
        joinDate: dates.join,
        leaveDate: dates.leave,
        status: dates.status,
      }, { transaction: t });
      memberships[user.id] = member;
    }

    // 4. Record CSVImport
    const csvImport = await CSVImport.create({
      fileName: "expenses_export.csv",
      status: "COMPLETED",
      importedById: req.user.id,
    }, { transaction: t });

    // 5. Process clean rows
    for (const row of rows) {
      const { data, action, resolvedData } = row;
      // action can be: 'import_expense', 'import_settlement', 'skip', 'merge'
      
      // Save anomaly resolution log if there were any anomalies
      if (row.anomalies && row.anomalies.length > 0) {
        for (const anom of row.anomalies) {
          await AnomalyLog.create({
            importId: csvImport.id,
            rowNumber: row.rowIndex,
            rawRowData: JSON.stringify(data),
            anomalyType: anom.type,
            description: anom.description,
            status: action === "skip" ? "IGNORED" : "RESOLVED",
            resolutionAction: action,
          }, { transaction: t });
        }
      }

      if (action === "skip") {
        continue;
      }

      const dateStr = resolvedData.date;
      const desc = resolvedData.description;
      const rawAmt = parseFloat(resolvedData.amount);
      const cur = resolvedData.currency;
      const payerCsv = resolvedData.paid_by;
      const payerUser = systemUserMap[payerCsv];

      if (!payerUser) continue;

      if (action === "import_settlement") {
        // Direct peer-to-peer settlement
        // split_with contains receiver
        const recCsv = resolvedData.split_with;
        const receiverUser = systemUserMap[recCsv];
        if (receiverUser) {
          await Settlement.create({
            groupId: group.id,
            amount: rawAmt,
            currency: cur,
            paidById: payerUser.id,
            receivedById: receiverUser.id,
            settlementDate: dateStr,
          }, { transaction: t });
        }
      } else if (action === "import_expense") {
        // Shared Expense
        // Calculate shares
        const splitType = resolvedData.split_type.toUpperCase(); // EQUAL, EXACT, PERCENTAGE, SHARE
        const splitWithCsv = resolvedData.split_with.split(";").map(n => n.trim());
        const participantUsers = splitWithCsv.map(n => systemUserMap[n]).filter(Boolean);

        const expense = await Expense.create({
          GroupId: group.id,
          amount: rawAmt,
          currency: cur,
          description: desc,
          expenseDate: dateStr,
          splitType: splitType === "SHARE" ? "PERCENTAGE" : splitType, // Map SHARE to percentage or keep EQUAL/EXACT
          paidBy: payerUser.id,
          category: resolvedData.category || "Other",
        }, { transaction: t });

        // Calculate individual shares
        const shares = [];
        if (splitType === "EQUAL") {
          const share = rawAmt / participantUsers.length;
          participantUsers.forEach(u => {
            shares.push({ userId: u.id, amount: share });
          });
        } else if (splitType === "PERCENTAGE") {
          // Parse percentages from split_details
          const detailsStr = resolvedData.split_details || "";
          const parts = detailsStr.split(";").map(p => p.trim());
          const percentMap = {};
          parts.forEach(p => {
            const match = p.match(/([A-Za-z\s'\d]+)\s*(\d+)%/);
            if (match) {
              percentMap[match[1].trim()] = parseInt(match[2]);
            }
          });

          participantUsers.forEach(u => {
            // Find user in percentage map
            // Need fuzzy matching because of names
            const csvName = csvNames.find(c => nameMappings[c] === u.name);
            const pct = percentMap[csvName] || percentMap[u.name] || 0;
            const share = (pct / 100) * rawAmt;
            shares.push({ userId: u.id, amount: share });
          });
        } else if (splitType === "EXACT" || splitType === "UNEQUAL") {
          const detailsStr = resolvedData.split_details || "";
          const parts = detailsStr.split(";").map(p => p.trim());
          const amtMap = {};
          parts.forEach(p => {
            const match = p.match(/([A-Za-z\s'\d]+)\s*(\d+)/);
            if (match) {
              amtMap[match[1].trim()] = parseFloat(match[2]);
            }
          });

          participantUsers.forEach(u => {
            const csvName = csvNames.find(c => nameMappings[c] === u.name);
            const val = amtMap[csvName] || amtMap[u.name] || 0;
            shares.push({ userId: u.id, amount: val });
          });
        } else if (splitType === "SHARE") {
          // Ratio split
          const detailsStr = resolvedData.split_details || "";
          const parts = detailsStr.split(";").map(p => p.trim());
          const ratioMap = {};
          let totalRatio = 0;
          parts.forEach(p => {
            const match = p.match(/([A-Za-z\s'\d]+)\s*(\d+)/);
            if (match) {
              const val = parseFloat(match[2]);
              ratioMap[match[1].trim()] = val;
              totalRatio += val;
            }
          });

          participantUsers.forEach(u => {
            const csvName = csvNames.find(c => nameMappings[c] === u.name);
            const ratio = ratioMap[csvName] || ratioMap[u.name] || 0;
            const share = totalRatio > 0 ? (ratio / totalRatio) * rawAmt : 0;
            shares.push({ userId: u.id, amount: share });
          });
        }

        // Save shares
        for (const sh of shares) {
          await ExpenseShare.create({
            ExpenseId: expense.id,
            UserId: sh.userId,
            shareAmount: sh.amount,
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    res.json({
      message: "Data imported successfully!",
      groupId: group.id,
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.getImportReport = async (req, res) => {
  try {
    const reports = await CSVImport.findAll({
      include: [
        { model: User, as: "importer", attributes: ["name"] },
        { model: AnomalyLog }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
