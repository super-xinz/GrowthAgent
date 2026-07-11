# MVP policy

The delivered application is shadow-only. There is no Reddit publishing endpoint or UI control. `AUTOPUBLISH_ENABLED` defaults false and cannot override the missing publisher. Product claims are generated only from stored public source excerpts. Production Reddit functionality must later require both `AUTOPUBLISH_ENABLED=true` and `COMMERCIAL_APPROVED`, alongside account, community, quota, decision, and kill-switch checks.

