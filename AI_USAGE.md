# AI USAGE - AI Collaboration Log

## AI Tools Used
* **Primary Collaborator**: Antigravity (Gemini 3.5 Flash)

---

## Key Prompts Used
1. "Ingest and analyze `expenses_export.csv` to detect 12+ deliberate data anomalies."
2. "Design a simplified peer-to-peer debt resolution algorithm for a group expense sharing application."
3. "Implement a React frontend displaying a list of resolved anomalies side-by-side with CSV rows."

---

## Code/Design Errors Caught & Corrected

### Case 1: Silent Failure in Case-Sensitive Model Casing
* **What the AI did**: Imported the User model as `const User = require("./User")` in `backend/src/models/index.js` while the file on disk was lowercase `user.js`.
* **How it was caught**: Noticed a potential case-sensitivity mismatch. While working on Windows, this is case-insensitive, but it will fail on Linux or case-sensitive build servers.
* **Correction**: Changed the import statement to `require("./user")` to exactly match the file on disk and maintain cross-platform compatibility.

### Case 2: Incorrect Math on Cumulative Debt Calculation
* **What the AI did**: Designed a balance algorithm that calculated net balance but omitted direct peer-to-peer settlements in the total balance summary.
* **How it was caught**: Manual inspection of the math. If Rohan paid Aisha back ₹5000 directly, Rohan's net balance should increase by ₹5000 and Aisha's should decrease by ₹5000, which wasn't accounted for in the initial draft of the balance controller.
* **Correction**: Added `settlementsSent` and `settlementsReceived` variables to the backend `getGroupBalances` calculation, ensuring the formula is: `(totalPaid + settlementsSent) - (totalOwed + settlementsReceived)`.

### Case 3: Creator Omitted from Group Membership
* **What the AI did**: Created the group in `groupController.js` but did not automatically register the group creator as an active group member.
* **How it was caught**: Realized that if the creator is not in the `GroupMembers` table, they cannot log expenses or participate in splits for that group.
* **Correction**: Added an automatic `GroupMember.create()` call inside the `createGroup` handler to add the creator as an active member upon group creation.
