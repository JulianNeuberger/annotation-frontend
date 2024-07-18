export const Workflow = {
    INPUT: 0,
    MENTION_SUGGESTION: 1,
    MENTION: 2,
    ENTITIES: 3,
    RELATION_SUGGESTION: 4,
    COMPLETE: 5
  };

export const stepDescriptions = [
    "Enter your data and submit to initiate the process.",  // Workflow.INPUT (0)
    "Review and adjust each suggested mention as necessary.",  // Workflow.MENTION_SUGGESTION (1)
    "Add or refine mentions.",  // Workflow.MENTION (2)
    `Review and adjust each entity cluster. Group the mentions into their respective entity clusters.`,  // Workflow.ENTITIES (3)
    "Examine each suggested relation and make adjustments as needed. Opt to 'Mark and Postpone' for later review if necessary. You can add relations in the next step.",  // Workflow.RELATION_SUGGESTION (3)
    "Review your annotations, add missing relations and review all marked relations, then submit your document."  // Workflow.COMPLETE (4)
];