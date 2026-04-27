Source: https://lessons.md

# service-organization-registry Lessons.md

## Public And Protected Paths Need Separate Proof

`/companies/public/` proving `200` is useful, but it is not enough. This service also needs a protected smoke with a valid admin JWT on `/companies/` and `/fleets/` so the auth contract is verified together with the data path.

## The Slice Can Start Read-Only In Prod

For the first production smoke, empty `[]` responses from protected list endpoints were still a valid success signal. They proved the service was reachable, the JWT contract was correct, and the database wiring was alive without inserting or mutating production rows.

## Navigation Keys Are Part Of The Contract

An admin token without `allowed_nav_keys=["companies"]` is not a valid smoke token for list views. Protected organization reads require both an authenticated admin role and the correct navigation policy in the JWT payload.
