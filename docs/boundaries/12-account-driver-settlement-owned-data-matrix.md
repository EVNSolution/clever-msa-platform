# 12. Account / Driver / Settlement Owned Data Matrix

`Identity Access`는 `Account / Auth`를 가리키는 동의어로 본다.

| Domain | Owned | Reference Only | Forbidden |
|---|---|---|---|
| Organization Master | company, fleet, org_unit, org_membership_policy, affiliation_reference_dictionary | 없음 또는 최소 | account credential, driver status, settlement result |
| Account / Auth | account, credential, session, token | driver_id, company_id, fleet_id | driver profile, settlement ledger |
| Driver Profile HR | driver, profile, employment_status, qualification_status | account_id, company_id, fleet_id, org_unit_id | password, otp_secret, payout_status |
| Settlement Payroll | settlement_run, settlement_item, deduction, incentive, payout_status | driver_id, company_id, fleet_id | account credential, driver profile |

`공유계정` / `정산용 식별자`는 로그인 identity가 아니며, 비로그인 정산 식별자로서 `Settlement Payroll`의 참조 또는 정산용 식별자 영역에 둔다.
