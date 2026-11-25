# Vendored, unedited

signoff.mjs from AgentiCCells__Cell__Email branch work/mail.dev.a, commit 3a1bb140ee9d92e6498965be2b0b90955a30aceb (24 Nov 2026), by mail.dev.a@AgentiCCells.dinis, Apache-2.0, reviewed by a.mail.conductor. The signed-batch sign-off the Email Cell checks: the CRM imports it so a byte cannot differ. Its one import (./vendor/pki/v0.2.28/keys.js) resolves to the same pki.sgit.ai version the CRM already vendors. crm/scripts/build-site.mjs copies it to the site root as is. crm/tests/fixtures/signoff-vector.json is the same commit's test vector.

Also the same bytes as SovereignWebsite/Site__Tool__Google__Gmail site/app/core/signoff.mjs at e31d4c2 (the Gmail tool, where the module now lives; checked against https://gmail.google.tool.sovereignweb.site/app/core/signoff.mjs on 25 Nov 2026). The test vector is still the Email Cell's tests/fixtures/signoff-vector.json at 3a1bb14.
