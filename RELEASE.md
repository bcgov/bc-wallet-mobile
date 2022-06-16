
v1.0.1

Build #203

- Add loading animation #304;
- Allow presenting revoked credentials #352;
- Add test and accessability labels to PIN screens.

Build #200

- Update app icons #342;
- Add testIDs to PIN screens;
- Fix first cell focused on PIN screen #388.

Build #197

- Implement new PIN screens;
- Allow errors to show technical message on demand;
- Use common decline screen for offer and proof #314;
- Fix modal decline screen #314;
- Lock phone orientation to portrait #192 ;
- Change the color and style of the details button on the proof screen #332;
- Change the field name in list (offer and proof) to be bold;
- List item background color to red for revoked credentials #343;
- Add back button to modal proof details screen;
- Fix status bar colour on proof / offer screens #336.

Build #190

- Fix app crashes during initialization #381.

Build #188

- Connect to ledger on on startup to improve performance;
- Add blue top bar to offer and proof modals #314;
- Fix faded status bar and wrong color on Android #336.

Build #186

- Expose credential list testIDs #367.

Build #185

- Fixed stuck on waiting screen #360.

Build #184

- Fix testIDs on credentials screen(s) #349;
- Add professional French translation; #224;
- Fix issue with LSBC credential issuance #337;
- Fix proof details style button style #332;
- Fix style of revoked credential #343;
- Fix credential offer covering top header #284;
- Update loading activity indicator;

Build #175

- Fix missing background in safe area overflow #341;
- Fix proof request covering back buttons #335;
- Fix activity indicator on Android;
- Use different testIDs for activity indicator.

Build #173

- Fixed credential offer screen display mode #284;

Build #172

- Fix text on proof declined screen;
- Add testID to loading modal.

Build #171

- Fix QR scan error (invalid QR code);
- Add initialization screen after PIN and remove toasts #322;
- Properly style status bar on light background modals #321 #336;
- Fix copy and image on proof declined screen #333;
- Adds SVG icon to empty list component and updates wording #320;
- Updates proof requests to display predicate fields #317;
- Adds Sovrin main net ledger config #317;
- Add proof accept animations #313.
- Store and mange credential revocation status #312.

Build #165

- Update animation assets for credential offer / accepted;
- Fix settings font size;
- Update empty credential list text;
- Hides remove button in credential details until AFJ/hooks are updated;
- Share button is hidden for proof request screen unless a valid proof can be presented;
- Add credential card to offer declined screen #315.

Build #164

- Bifold logo flashes at app startup #283;
- Enable RN Splash screen #289.

Build #162

- Connecting modal is not correctly skinned #293;
- Add animation for waiting for credential #240;
- Add animation for credential added to wallet #240;
- Update terms and conditions screen to final version #222 #285;
- Rework modals to provide smoother transitions #290;
- Don't show delay message prematurely #294;
- Track revoked credential status;
- Under-the-hood theme and context refactoring.

Build #154

- Fixes early notification modal display on various intermediate screens #253;
- Relax Aries RFC 0441;
- Add connection in-progress animation;
- Handle proof request shortly following a new connection;
- Handle offer shortly following a new connection;
- Minor UI improvements;
- Add testIDs throughout the application.


Build #130

- Fixed missing storage key and erroneous imports #230;
- Adds revoked status to credential attributes during presentation request #64;
- Removes botton tab navigation from credential offer and proof request screens #210;
- More UI/UX fixes to the notification modals;

Build #127

- Fix header "Skip" button color #214;
- Add testID to improve testability #216;

Build #125

- Use BCGov hosted mediator (agent);
- Align proof request mechanics to the rest of the app;
- Use error modal as needed in proof requests;
- Clean up navigation stacks/screens and naming;
- Numerous UI/UX fixes to on-boarding tutorial #173;
- Add and use BCSans font #171.

Build #117

- Base security updates (from Ontario);
- Remove toast from scan connection success #201;
- Remove extra buttons from cred #182;
- Fix partially obscured buttons #195;
- Locks orientation in portrait mode;
- Invalid QR code no longer displays connection modal #177;
- Improves colour contrast for error message on scan screen #178;
- Accepting a credential offer will navigate to credential list only #180;
- Notification body better aligned to designs #175;
- The number of credentials in the wallet needs to be in bold #175;
- The 'See all' link should be hidden for just one notification #175;
- Fix notifications list screen title #175;
- The notification list screen needs the back button implemented #175.

Build #114

- Better align pager controls on tutorial screen #149;
- Extract version number to Settings screen #127;
- Refactor credential attributes list items;
- Align Android version to 1.0.1 (match iOS) #186;
- Fixed navbar layout issues;
- Fixed application icons #142;
- Fixed home screen UX issues #174;

Build #96

- Update to navigation mechanics and styled navigation bar 🔥

Build #87

- Fix issue preventing accepting credential offers #170
- Style credential offer screen #79
