# Privacy Policy

**Last Updated:** July 31, 2026

At QuietLabels, your privacy is a priority. This Privacy Policy explains how our Gmail add-on accesses, processes, and handles your data. Because QuietLabels is built entirely on the Google Workspace infrastructure, your email data **never leaves your Google Workspace cloud environment**.

As an open-source project, our full source code is publicly verifiable at <https://github.com/alexwforsythe/gmail-quiet-labels>.

---

## 1. Google OAuth Scopes Used

QuietLabels explicitly requests and uses the following Google OAuth scopes to perform its core automation features:

- **`https://googleapis.com` (UI Rendering):** Required to display the interactive user interface and control buttons directly within your Gmail application.
- **`https://googleapis.com` (Automated Execution):** Allows the add-on to establish time-based background triggers so it can automate your inbox organization on a schedule.
- **`https://googleapis.com` (Gmail Modification):** Used exclusively to read minimal email metadata and to modify your email state by removing the "INBOX" label to archive specific threads.

---

## 2. Information We Access and Process

The add-on accesses the following data types through the authorized scopes listed above:

- **Gmail Labels:** We retrieve your list of custom label names so you can select which label to monitor.
- **Email Metadata (Threads and Messages):** When running a scheduled cleanup, the add-on searches your mailbox using targeted filters (e.g., matching specific labels and specific time windows). We read basic metadata such as thread IDs, message IDs, and timestamps (internal dates) to identify which threads need to be archived.
- **Implicit Search Data:** Because the add-on queries Gmail based on label configurations and time frames, the script implicitly processes the correlation between those labels and the timestamps of your recent replies.
- **Basic Analytics:** We use Google Analytics to track and analyze anonymized usage metrics, error rates, and performance data to improve our services. All advertising and remarketing features are strictly disabled. We do not collect or transmit personal email contents or metadata via analytics. To opt out of being tracked by Google Analytics across the Services, visit <https://tools.google.com/dlpage/gaoptout>. For more information on the privacy practices of Google, please visit the [Google Privacy & Terms page](https://policies.google.com/privacy).

---

## 3. How We Use and Modify Your Data

QuietLabels uses its permissions for the sole purpose of automating your inbox organization:

- **Archiving Emails:** The add-on automatically modifies your email state by removing the "INBOX" label from threads that match your criteria, effectively archiving them.
- **Automated Background Runs:** It uses native triggers to clean up your inbox automatically on a background schedule without requiring you to keep the add-on open.

---

## 4. Data Storage and Third-Party Sharing

QuietLabels is engineered with a **zero-egress architecture**:

- **No External Servers:** We do not operate external databases or servers. We do not copy, transfer, download, or sell your email contents, metadata, or personal information.
- **Native Infrastructure:** All data processing occurs locally within the Google Apps Script environment. Configuration settings (such as your chosen "quiet" label) are stored exclusively using Google's native Workspace API storage.
- **No Third-Party Sharing:** Your personal data is never shared with, sold to, or reviewed by any third party.
- **Enterprise Administration:** If QuietLabels is installed on your account by a Google Workspace Domain Administrator, your organization's admin has the ability to manage deployment settings or revoke the add-on's data access permissions at any time.

---

## 5. Data Security and Protection Mechanisms

We take the security and confidentiality of your sensitive Google user data seriously. Because QuietLabels runs natively within the Google Workspace environment, it leverages Google's enterprise-grade infrastructure to protect your information.

Our explicit data protection mechanisms include:

- **In-Transit Encryption:** All communication between the add-on and Google APIs is automatically secured using industry-standard Transport Layer Security (TLS) encryption protocol.
- **At-Rest Encryption:** Any application states or configuration preferences are stored natively using Google Apps Script's properties infrastructure, which utilizes Google's secure, encrypted cloud data centers.
- **Technical Safeguards:** Security procedures are strictly enforced via our open-source codebase to ensure the confidentiality of your data. The add-on only requests read access to minimal headers (IDs and dates) and restricts all data operations exclusively within your own authorized Google account session.
- **No External Vulnerabilities:** By operating a zero-egress architecture with no external servers, databases, or API entry points, we eliminate the risk of external data breaches or unauthorized third-party access.

---

## 6. Data Retention and Deletion

Because QuietLabels operates entirely on a zero-egress architecture, our data retention and deletion policies are tied directly to your native Google Account:

- **Email and Metadata Retention:** QuietLabels does not pull, copy, or retain your emails or metadata on any external infrastructure. Your email data remains entirely subject to your own Google Workspace retention settings and storage limits.
- **App Configuration Retention:** Your custom add-on settings (such as which label you choose to automate) are stored natively inside the Google Apps Script User Properties service. This configuration is retained only as long as the add-on remains installed.
- **Data Deletion & Revocation:** You can delete all application state data, configuration records, and automation schedules instantly at any time. Simply uninstall QuietLabels from the Google Workspace Marketplace or revoke the add-on's permissions within your [Google Account Security Settings](https://myaccount.google.com). Once uninstalled, the add-on loses all access, and any settings stored in Google's native properties service are automatically cleared.

---

## 7. Limited Use Compliance

QuietLabels' use and transfer of information received from Google APIs to any other app will adhere to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the **Limited Use** requirements. We strictly adhere to the principle of data minimization and do not use access to user data for serving advertisements or tracking user behavior across external platforms.

---

## 8. Regional Privacy Disclosures (EU, UK, US, CA, AU, NZ, ZA)

Depending on your location, local jurisdictions grant specific rights regarding personal data. QuietLabels complies with these global laws through its zero-egress architecture:

- **EU & UK Users (GDPR / UK Data Protection Act):**
  - **Lawful Basis:** Processing is based on your explicit consent when authorizing the OAuth scopes, and is necessary for the performance of a contract (delivering the add-on functionality you requested).
  - **Data Subject Rights:** You have the right to access, rectify, restrict, or erase your data, and withdraw consent. Because we store zero data on our own infrastructure, you can exercise all of these rights instantly and independently by uninstalling the add-on and revoking permissions in your Google Account Security settings.
- **United States & California Users (CCPA / CPRA & State Privacy Laws):**
  - We do not "sell" or "share" your personal data or sensitive personal info as defined by California law.
  - We do not track users across the web for advertising purposes.
- **Australia & New Zealand Users (Privacy Act 1988 / Privacy Act 2020):**
  - We handle your personal information strictly for the primary purpose it was disclosed (inbox automation). No information is transferred by us across borders to foreign servers.
- **South Africa Users (POPIA):**
  - Data processing is limited exclusively to executing the inbox rules you actively establish. No third-party data distribution takes place.

---

## 9. Open Source Verification

We believe in absolute transparency. Because QuietLabels is licensed under the
**MIT License**, you can inspect, audit, and review the exact codebase to verify
that our data handling practices match this policy. The source code is available
on our [GitHub repository](https://github.com/alexwforsythe/gmail-quiet-labels).

---

## 10. Children's Privacy

QuietLabels is designed for a general audience and does not knowingly collect, access, or process personal information from children under the age of 13 (or under 16 in the EU/UK). If you are a parent or guardian and believe your child has installed the add-on, please note that no data is retained or transmitted to external servers. You can completely remove access by uninstalling the add-on from their Google account.

---

## 11. Contact Information

If you have any questions or feedback regarding this Privacy Policy or the security of the add-on, please open an issue on our [GitHub repository](https://github.com/alexwforsythe/gmail-quiet-labels/issues).
