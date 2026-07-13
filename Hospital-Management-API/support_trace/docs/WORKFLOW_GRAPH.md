# Workflow Graph (Incident)

Typed graph model in `support_trace/incident/types.py`:

- **Nodes:** `WorkflowNode` with types Patient, Laboratory, Provider, Message, Payment, Workflow
- **Edges:** Parent, Child, Triggered, DependsOn, Retry, Communication

Built by `WorkflowGraphBuilder` from `TraceLookupResult.workflow_graph`, traces, and `IDENTIFIER_WORKFLOW_CHAIN`.

Journey: Patient → Consultation → Recommendation → Booking → Routing → Report → Delivery → WhatsApp
