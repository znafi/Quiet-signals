import type { Scenario } from './types'

export const SCENARIOS: Scenario[] = [
  {
    title: 'Public Challenge From a Manager',
    scenarioText:
      "You are presenting an idea during a team meeting. Your manager interrupts and says, 'I don't think this is the right direction. We've already discussed this before.' The room goes quiet.",
    questions: [
      {
        question: 'What do you do first?',
        choices: [
          { key: 'A', text: 'I soften my position and move on.', scores: { patternRigidity: 2 }, tags: ['authorityPreservation'] },
          { key: 'B', text: 'I defend my idea and explain in detail.', scores: { patternRigidity: 2 }, tags: ['performanceAdaptation'] },
          { key: 'C', text: 'I go quiet and withdraw.', scores: { capacityNarrowing: 2 }, flags: { shutdownIndicator: true } },
          { key: 'D', text: 'I stay composed, but I can feel myself getting activated.', scores: { patternRecognition: 1, capacityNarrowing: 1 }, tags: ['professionalismAdaptation'] },
          { key: 'E', text: 'I ask a clarifying question before responding.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What is most true internally?',
        choices: [
          { key: 'A', text: 'I feel embarrassed and exposed.', scores: { capacityNarrowing: 2 }, flags: { selfWorthIndicator: true } },
          { key: 'B', text: 'I feel frustrated that I was undermined.', scores: { patternRecognition: 1 } },
          { key: 'C', text: 'I start questioning whether I belong in that room.', scores: { capacityNarrowing: 2 }, tags: ['belongingPressure'], flags: { selfWorthIndicator: true } },
          { key: 'D', text: 'I notice I am activated, but I can still think clearly.', scores: { patternRecognition: 2 } },
          { key: 'E', text: 'I can separate the feedback from my worth.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What makes the moment difficult?',
        choices: [
          { key: 'A', text: 'Challenging authority feels disrespectful or risky.', scores: { patternRigidity: 1 }, tags: ['authorityPreservation'] },
          { key: 'B', text: 'I do not want to create tension in the room.', scores: { patternRigidity: 1 }, tags: ['harmonyPreservation'] },
          { key: 'C', text: 'I worry I will be seen as difficult or too much.', scores: { capacityNarrowing: 1 }, tags: ['belongingPressure'] },
          { key: 'D', text: 'I feel pressure to prove I am competent.', scores: { patternRigidity: 1 }, tags: ['performanceAdaptation'] },
          { key: 'E', text: 'I can see the context and choose how I want to respond.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What tends to happen after?',
        choices: [
          { key: 'A', text: 'I avoid bringing ideas forward again.', scores: { patternRigidity: 2 }, flags: { lowReEngagement: true } },
          { key: 'B', text: 'I work harder to prove myself next time.', scores: { patternRigidity: 2 }, tags: ['performanceAdaptation'] },
          { key: 'C', text: 'I keep replaying it and struggle to move on.', scores: { capacityNarrowing: 2 }, flags: { lowReEngagement: true } },
          { key: 'D', text: 'I reflect, talk it through, and re-engage.', scores: { reEngagement: 2 } },
          { key: 'E', text: 'I identify what I want to do differently next time.', scores: { expansionReadiness: 2 } },
        ],
      },
    ],
  },
  {
    title: 'Difficult Feedback About Visibility',
    scenarioText:
      'Your manager says your work is strong, but you need to be more strategic and visible in leadership conversations.',
    questions: [
      {
        question: 'What do you do first?',
        choices: [
          { key: 'A', text: 'I immediately question whether I am capable.', scores: { capacityNarrowing: 2 }, flags: { selfWorthIndicator: true } },
          { key: 'B', text: 'I start working harder and overpreparing.', scores: { patternRigidity: 2 }, tags: ['performanceAdaptation'] },
          { key: 'C', text: 'I avoid speaking up even more.', scores: { capacityNarrowing: 2 }, flags: { lowReEngagement: true } },
          { key: 'D', text: 'I ask for examples so I understand the feedback.', scores: { expansionReadiness: 2 } },
          { key: 'E', text: 'I reflect on where this pattern may show up.', scores: { patternRecognition: 2 } },
        ],
      },
      {
        question: 'What is most true internally?',
        choices: [
          { key: 'A', text: 'I feel like I have failed.', scores: { capacityNarrowing: 2 }, flags: { selfWorthIndicator: true } },
          { key: 'B', text: 'I feel pressure to become someone I am not.', scores: { capacityNarrowing: 1 }, tags: ['professionalismAdaptation'] },
          { key: 'C', text: 'I feel annoyed because the feedback is vague.', scores: { patternRecognition: 1 } },
          { key: 'D', text: 'I notice the feedback activates visibility pressure.', scores: { patternRecognition: 2 }, tags: ['visibilitySafety'] },
          { key: 'E', text: 'I can stay curious even if it is uncomfortable.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What makes this difficult?',
        choices: [
          { key: 'A', text: 'Being visible feels like self-promotion, and that feels uncomfortable.', scores: { patternRigidity: 1 }, tags: ['visibilitySafety'] },
          { key: 'B', text: 'I was taught that good work should speak for itself.', scores: { patternRigidity: 1 }, tags: ['professionalismAdaptation'] },
          { key: 'C', text: 'I worry that taking up space will be judged.', scores: { capacityNarrowing: 1 }, tags: ['belongingPressure'] },
          { key: 'D', text: 'I can see this is partly a workplace expectation I need to learn to navigate.', scores: { expansionReadiness: 2 } },
          { key: 'E', text: 'I can separate visibility from ego.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What tends to happen after?',
        choices: [
          { key: 'A', text: 'I become more careful and less visible.', scores: { patternRigidity: 2 }, flags: { lowReEngagement: true } },
          { key: 'B', text: 'I overwork to compensate.', scores: { patternRigidity: 2 }, tags: ['performanceAdaptation'] },
          { key: 'C', text: 'The feedback stays with me for days.', scores: { capacityNarrowing: 2 }, flags: { lowReEngagement: true } },
          { key: 'D', text: 'I identify one concrete behavior to practice.', scores: { expansionReadiness: 2 } },
          { key: 'E', text: 'I ask for support or coaching to build the skill.', scores: { reEngagement: 2 } },
        ],
      },
    ],
  },
  {
    title: 'Conflict With a Colleague',
    scenarioText:
      'A colleague challenges your decision during a high-pressure conversation in front of others.',
    questions: [
      {
        question: 'What do you do first?',
        choices: [
          { key: 'A', text: 'I become defensive.', scores: { patternRigidity: 2 } },
          { key: 'B', text: 'I shut down and disengage.', scores: { capacityNarrowing: 2 }, flags: { shutdownIndicator: true, lowReEngagement: true } },
          { key: 'C', text: 'I quickly agree to avoid tension.', scores: { patternRigidity: 2 }, tags: ['harmonyPreservation'] },
          { key: 'D', text: 'I notice my reaction before responding.', scores: { patternRecognition: 2 } },
          { key: 'E', text: 'I stay engaged and ask what they are seeing differently.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What is most true internally?',
        choices: [
          { key: 'A', text: 'I feel attacked.', scores: { capacityNarrowing: 1 } },
          { key: 'B', text: 'I feel pressure to save face.', scores: { patternRigidity: 1 }, tags: ['performanceAdaptation'] },
          { key: 'C', text: 'I feel responsible for keeping the room calm.', scores: { patternRigidity: 1 }, tags: ['harmonyPreservation'] },
          { key: 'D', text: 'I can feel the tension and stay present.', scores: { reEngagement: 1, expansionReadiness: 1 } },
          { key: 'E', text: 'I can be challenged without losing my ground.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What makes this difficult?',
        choices: [
          { key: 'A', text: 'Disagreement feels personal.', scores: { capacityNarrowing: 1 } },
          { key: 'B', text: 'Open conflict feels unsafe or disrespectful.', scores: { patternRigidity: 1 }, tags: ['conflictConditioning'] },
          { key: 'C', text: 'I worry others will see me as unprepared.', scores: { patternRigidity: 1 }, tags: ['performanceAdaptation'] },
          { key: 'D', text: 'I can see disagreement as information, not rejection.', scores: { expansionReadiness: 2 } },
          { key: 'E', text: 'I can hold both the relationship and the decision.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What tends to happen after?',
        choices: [
          { key: 'A', text: 'I distance myself from the colleague.', scores: { patternRigidity: 2 }, flags: { lowReEngagement: true } },
          { key: 'B', text: 'I keep thinking about what I should have said.', scores: { capacityNarrowing: 2 }, flags: { lowReEngagement: true } },
          { key: 'C', text: 'I avoid future disagreement.', scores: { patternRigidity: 2 }, flags: { lowReEngagement: true } },
          { key: 'D', text: 'I follow up to clarify and repair if needed.', scores: { reEngagement: 2 } },
          { key: 'E', text: 'I reflect on how to handle conflict with more steadiness.', scores: { expansionReadiness: 2 } },
        ],
      },
    ],
  },
  {
    title: 'Overcommitment and Boundaries',
    scenarioText: 'You are already overloaded, but your manager asks you to take on another important task.',
    questions: [
      {
        question: 'What do you do first?',
        choices: [
          { key: 'A', text: 'I say yes immediately.', scores: { patternRigidity: 2 }, tags: ['roleConditioning'] },
          { key: 'B', text: 'I say yes, then feel resentful later.', scores: { patternRigidity: 1, capacityNarrowing: 1 } },
          { key: 'C', text: 'I freeze because I do not know how to respond.', scores: { capacityNarrowing: 2 }, flags: { shutdownIndicator: true } },
          { key: 'D', text: 'I pause and assess my actual bandwidth.', scores: { patternRecognition: 2 } },
          { key: 'E', text: 'I name my capacity and discuss priorities.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What is most true internally?',
        choices: [
          { key: 'A', text: 'Saying no feels risky.', scores: { capacityNarrowing: 1 } },
          { key: 'B', text: 'I do not want to disappoint anyone.', scores: { patternRigidity: 1 }, tags: ['harmonyPreservation'] },
          { key: 'C', text: 'I feel trapped between performance and capacity.', scores: { capacityNarrowing: 2 } },
          { key: 'D', text: 'I can notice the pressure without immediately reacting.', scores: { patternRecognition: 2 } },
          { key: 'E', text: 'I can tolerate the discomfort of negotiating capacity.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What makes this difficult?',
        choices: [
          { key: 'A', text: 'Being helpful is part of how I have learned to be valued.', scores: { patternRigidity: 1 }, tags: ['roleConditioning'] },
          { key: 'B', text: 'I worry boundaries will be seen as selfish or not committed.', scores: { capacityNarrowing: 1 }, tags: ['belongingPressure'] },
          { key: 'C', text: 'I was taught to push through and not complain.', scores: { patternRigidity: 1 }, tags: ['professionalismAdaptation'] },
          { key: 'D', text: 'I can see the difference between contribution and overextension.', scores: { expansionReadiness: 2 } },
          { key: 'E', text: 'I can protect the work by being honest about capacity.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What tends to happen after?',
        choices: [
          { key: 'A', text: 'I become overloaded and the quality of work drops.', scores: { capacityNarrowing: 2 }, flags: { lowReEngagement: true } },
          { key: 'B', text: 'I feel resentful but keep saying yes.', scores: { patternRigidity: 2 } },
          { key: 'C', text: 'I withdraw or burn out quietly.', scores: { capacityNarrowing: 2 }, flags: { shutdownIndicator: true, lowReEngagement: true } },
          { key: 'D', text: 'I revisit priorities and communicate early.', scores: { reEngagement: 2 } },
          { key: 'E', text: 'I use the moment to practice a clearer boundary next time.', scores: { expansionReadiness: 2 } },
        ],
      },
    ],
  },
  {
    title: 'High Stakes Leadership Decision',
    scenarioText:
      'You need to make a visible leadership decision with incomplete information and competing opinions from others.',
    questions: [
      {
        question: 'What do you do first?',
        choices: [
          { key: 'A', text: 'I overanalyze and delay.', scores: { patternRigidity: 2 } },
          { key: 'B', text: 'I defer to others to avoid getting it wrong.', scores: { patternRigidity: 2 } },
          { key: 'C', text: 'I feel intense anxiety and struggle to choose.', scores: { capacityNarrowing: 2 } },
          { key: 'D', text: 'I identify what information is enough to move forward.', scores: { expansionReadiness: 2 } },
          { key: 'E', text: 'I make the best decision available and stay open to adjusting.', scores: { expansionReadiness: 2, reEngagement: 1 } },
        ],
      },
      {
        question: 'What is most true internally?',
        choices: [
          { key: 'A', text: 'I feel like one wrong move will define me.', scores: { capacityNarrowing: 2 }, flags: { selfWorthIndicator: true } },
          { key: 'B', text: 'I feel responsible for everyone\'s reaction.', scores: { patternRigidity: 1 }, tags: ['harmonyPreservation'] },
          { key: 'C', text: 'I do not trust myself unless others agree.', scores: { capacityNarrowing: 2 } },
          { key: 'D', text: 'I can notice the fear and still think through the decision.', scores: { patternRecognition: 2 } },
          { key: 'E', text: 'I can tolerate uncertainty without collapsing.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What makes this difficult?',
        choices: [
          { key: 'A', text: 'Being wrong feels unsafe.', scores: { capacityNarrowing: 1 } },
          { key: 'B', text: 'I feel pressure not to disappoint people who are relying on me.', scores: { patternRigidity: 1 }, tags: ['harmonyPreservation'] },
          { key: 'C', text: 'I worry my decision will affect how credible I seem.', scores: { patternRigidity: 1 }, tags: ['performanceAdaptation'] },
          { key: 'D', text: 'I can see leadership requires imperfect decisions sometimes.', scores: { expansionReadiness: 2 } },
          { key: 'E', text: 'I can hold accountability without needing certainty.', scores: { expansionReadiness: 2 } },
        ],
      },
      {
        question: 'What tends to happen after?',
        choices: [
          { key: 'A', text: 'I keep second-guessing myself.', scores: { capacityNarrowing: 2 }, flags: { lowReEngagement: true } },
          { key: 'B', text: 'I look for reassurance repeatedly.', scores: { patternRigidity: 2 } },
          { key: 'C', text: 'I avoid future decisions with high visibility.', scores: { patternRigidity: 2 }, flags: { lowReEngagement: true } },
          { key: 'D', text: 'I review the outcome and learn from it.', scores: { reEngagement: 2 } },
          { key: 'E', text: 'I integrate what I learned into future decisions.', scores: { expansionReadiness: 2, reEngagement: 1 } },
        ],
      },
    ],
  },
]
