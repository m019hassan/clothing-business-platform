# AI Approval Workflow

## Overview
Sensitive AI actions require a human approval step to reduce risk.

## Workflow
1. The AI agent identifies a tool call that is high-risk or sensitive.
2. The request is marked pending approval.
3. An authorized human user reviews the action details.
4. Approval or rejection is recorded.
5. The action is executed only if approved.

## Approval examples
- Delete product
- Change payment settings
- Issue refund
- Change critical configuration

## Audit trail
Each approval request and decision must be logged with actor, action, reason, timestamp, and result.
