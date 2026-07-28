# Factory and Manufacturing

## MVP position
Manufacturing support will be minimal in the MVP. The initial system should not attempt a full ERP-style factory management layer.

## MVP manufacturing features
- Track simple production-related information for future planning
- Record basic production output if needed
- Keep the architecture ready for later BOM and production order support

## Future manufacturing features
- Raw materials and supplier tracking
- Bill of Materials
- Production orders
- Material consumption
- Finished-goods output history

## Design guidance
The domain model should support future production entities without forcing them into the MVP. Production-related concepts should be isolated from core sales and inventory flows until the business needs more maturity.
