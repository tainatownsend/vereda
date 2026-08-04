-- PR-0048 reviewed boundary readiness inspection only.
-- Plain SELECT statements only; this file intentionally contains no mutation or execution block.
select 'public_decisions'::text as readiness_metric, 144::integer as expected_count
union all select 'status_only_candidates', 74
union all select 'locator_mutation_contract_required', 6
union all select 'merge_contract_required', 53
union all select 'unresolved_not_eligible', 11
union all select 'application_ready_operations', 0;
