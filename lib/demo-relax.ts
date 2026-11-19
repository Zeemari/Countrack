/**
 * TEMPORARY, for recording the demo video only. Remove this file and its two call sites afterwards.
 *
 * With DEMO_RELAX_SHEET_CHECKS=true, a photo of an EC8A on a screen or a handwritten copy is accepted:
 * the polling-unit code check is skipped and any legible result sheet counts as an EC8A.
 * Unset (the default), nothing changes.
 */
export const demoRelaxSheetChecks = () => process.env.DEMO_RELAX_SHEET_CHECKS === "true";
