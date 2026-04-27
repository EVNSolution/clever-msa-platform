Source: https://lessons.md

# service-personnel-document-registry Lessons.md

This repo is the metadata truth for personnel documents, not the binary storage owner. Keep file blobs, approval workflow, and wider aggregates outside this boundary even if the admin UI reads them nearby.

The honest external proof is a protected document path under `/api/personnel-documents/`, not just `/health/`. That verifies the metadata surface without pretending the whole document pipeline lives here.
