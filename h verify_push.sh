[33mcommit c71a8c758f695978609432b102478759980f98cc[m[33m ([m[1;36mHEAD -> [m[1;32mmain[m[33m)[m
Author: cryptomx1 <cryptomx1@example.com>
Date:   Tue Oct 28 12:02:56 2025 -0400

    🧠 Enhanced truth-init.sh with self-healing & autostart logic

 .grok/federated_log.jsonl                    |    2 [32m+[m
 .grok/session_snapshot.json                  |    6 [32m+[m
 .grok/settings.json                          |    3 [32m+[m
 authenticity_precommit.hash                  |    2 [32m+[m
 binder-fix.mjs                               |   86 [32m+[m
 browser_verification.js                      |  108 [32m++[m
 data/did.json                                |    6 [32m+[m
 data/did_registry.json                       |   20 [32m+[m
 grok                                         |   76 [32m+[m
 onboard/app.js                               |    4 [32m+[m[31m-[m
 onboard/index.html                           |    4 [32m+[m[31m-[m
 package-lock.json                            | 2239 [32m+++++++++++++++++++++++++[m[31m-[m
 package.json                                 |    5 [32m+[m[31m-[m
 phase_xxxvii_audit.sh                        |   37 [32m+[m
 sandbox_binder/ipfs_publisher.mjs            |   72 [32m+[m
 sandbox_binder/server.mjs                    |  133 [32m++[m
 sandbox_binder/server.mjs.bak                |  112 [32m++[m
 sandbox_onboard/{ => public}/app.js          |    4 [32m+[m[31m-[m
 sandbox_onboard/{ => public}/index.html      |   16 [32m+[m[31m-[m
 sandbox_onboard/public/scripts/onboard.js    |   43 [32m+[m
 sandbox_onboard/{ => public}/style.css       |    0
 sandbox_onboard/server.mjs                   |   12 [32m+[m[31m-[m
 services/{auth.cjs => auth.mjs}              |    0
 services/binder.cjs                          |   34 [31m-[m
 services/binder.mjs                          |   89 [32m+[m
 services/did_onboard.sh                      |   81 [32m+[m
 services/{encryptor.cjs => encryptor.mjs}    |    0
 services/{seed.cjs => seed.mjs}              |    0
 settlements/dashboard/commit_phase.sh        |    2 [32m+[m[31m-[m
 settlements/dashboard/dashboard.json         |    2 [32m+[m[31m-[m
 settlements/dashboard/index.html             |    2 [32m+[m[31m-[m
 settlements/dashboard/insight_weave.sh       |    6 [32m+[m[31m-[m
 settlements/dashboard/insights.json          |    4 [32m+[m[31m-[m
 settlements/merchant_settlement_window.csv   |    2 [32m+[m[31m-[m
 settlements/merchant_settlement_window.jsonl |    2 [32m+[m[31m-[m
 settlements/merchant_summary.json            |    2 [32m+[m[31m-[m
 site.zip                                     |  Bin [31m73513[m -> [32m0[m bytes
 temp.zip                                     |  Bin [31m67964[m -> [32m0[m bytes
 tools/audit-live.sh                          |   89 [31m-[m
 tools/cid-peers.cjs                          |   51 [31m-[m
 verify_push.sh                               |   27 [32m+[m
 41 files changed, 3113 insertions(+), 270 deletions(-)
