import type { QuizContent, Scenario } from './types'

export const SCENARIOS: Scenario[] = [
  {
    id: 'scenario-1',
    order: 1,
    title: 'Monday morning',
    scenarioText: 'You arrive at work and sit down at your desk.',
    questions: [
      {
        dimension: 'exhaustion',
        question: 'How does your body feel as you settle in to start the day?',
        choices: [
          { key: 'A', text: 'I feel a bit sluggish, but I push through once I get started', description: 'I feel groggy or low-energy at first and may rely on coffee, music, or routine to get moving.', scores: { exhaustion: 1 } },
          { key: 'B', text: 'I feel ready and have enough energy to get going', description: 'I feel awake and steady. I can start work without needing caffeine, extra breaks, or mental buildup.', scores: { exhaustion: 0 } },
          { key: 'C', text: "I feel drained before I've even begun. It takes real effort just to open my laptop", description: 'My body feels heavy, I may want to avoid starting altogether, and even simple tasks feel exhausting.', scores: { exhaustion: 2 } },
        ],
      },
      {
        dimension: 'mentalDistancing',
        question: "You look at your task list for the day. What's your reaction?",
        choices: [
          { key: 'A', text: 'I feel a sense of dread or indifference. It all feels pointless', description: 'I may procrastinate, stare at the list without starting, or think, "what is the point?"', scores: { mentalDistancing: 2 } },
          { key: 'B', text: "I go through the motions without much thought about what I'm doing", description: 'I feel emotionally flat and mostly focus on ticking boxes or getting through the day.', scores: { mentalDistancing: 1 } },
          { key: 'C', text: "I feel engaged and ready to dig into what's ahead", description: 'I feel interested in the work and can picture myself getting things done productively.', scores: { mentalDistancing: 0 } },
        ],
      },
      {
        dimension: 'cognitiveImpairment',
        question: 'You sit down to start your first task. What happens?',
        choices: [
          { key: 'A', text: 'I focus easily and get into it quickly', description: 'My thinking feels clear. I can read, plan, and respond without much effort.', scores: { cognitiveImpairment: 0 } },
          { key: 'B', text: 'I keep losing my train of thought and struggle to get started', description: 'I may stare at the screen, forget what I was doing mid-task, or jump between tabs without progress.', scores: { cognitiveImpairment: 2 } },
          { key: 'C', text: 'I have to re-read things a few times before they sink in', description: 'I lose focus easily, forget what I just read, or need extra time to process information.', scores: { cognitiveImpairment: 1 } },
        ],
      },
      {
        dimension: 'emotionalImpairment',
        question: 'A colleague stops by to chat before the day begins. How do you respond?',
        choices: [
          { key: 'A', text: "I respond politely but feel like I'm going through the motions", description: 'I force a smile or small talk, but internally feel detached or tired.', scores: { emotionalImpairment: 1 } },
          { key: 'B', text: 'I feel irritated by the interruption or have to hold back a sharp response', description: 'I feel tense, impatient, or emotionally reactive over a minor interaction.', scores: { emotionalImpairment: 2 } },
          { key: 'C', text: 'I engage normally and am happy to connect', description: 'I feel comfortable socially and can respond warmly or naturally.', scores: { emotionalImpairment: 0 } },
        ],
      },
    ],
  },
  {
    id: 'scenario-2',
    order: 2,
    title: 'Urgent task',
    scenarioText: 'Your manager sends you an urgent task with a tight deadline.',
    questions: [
      {
        dimension: 'exhaustion',
        question: 'When you read the request, what does your body do?',
        choices: [
          { key: 'A', text: "I feel immediately overwhelmed and physically heavy. I don't know where I'll find the energy", description: 'My chest may tighten, my body feels weighed down, or I feel like shutting down before I begin.', scores: { exhaustion: 2 } },
          { key: 'B', text: 'I feel engaged. I know I can handle this', description: 'I feel alert and capable of shifting into work mode without much stress.', scores: { exhaustion: 0 } },
          { key: 'C', text: "I feel a wave of tiredness but tell myself I'll manage", description: 'I may sigh, rub my eyes, grab another coffee, or mentally brace myself before starting.', scores: { exhaustion: 1 } },
        ],
      },
      {
        dimension: 'mentalDistancing',
        question: 'How do you approach completing the task?',
        choices: [
          { key: 'A', text: 'I think it through carefully and feel invested in doing it well', description: 'I still care about the outcome and want to produce quality work.', scores: { mentalDistancing: 0 } },
          { key: 'B', text: "I do what's needed on autopilot without thinking much about quality", description: 'I focus on finishing quickly rather than feeling connected to the work.', scores: { mentalDistancing: 1 } },
          { key: 'C', text: "I feel detached. I do the bare minimum and don't really care how it turns out", description: 'I may rush through it, avoid effort, or feel emotionally checked out from the result.', scores: { mentalDistancing: 2 } },
        ],
      },
      {
        dimension: 'cognitiveImpairment',
        question: 'As you work through the task, what do you notice?',
        choices: [
          { key: 'A', text: 'I have to redo parts because I missed details or lost focus', description: 'I may forget instructions, skip steps, or reread emails multiple times.', scores: { cognitiveImpairment: 1 } },
          { key: 'B', text: "I make several errors and can't seem to hold the information in my head", description: 'I lose track of what I am doing, make careless mistakes, or feel mentally foggy throughout.', scores: { cognitiveImpairment: 2 } },
          { key: 'C', text: 'I can focus and work through it clearly', description: 'I can organize my thoughts and keep track of details without much difficulty.', scores: { cognitiveImpairment: 0 } },
        ],
      },
      {
        dimension: 'emotionalImpairment',
        question: 'Midway through, a colleague asks a small favour. How do you react?',
        choices: [
          { key: 'A', text: "I respond calmly. I either help briefly or explain I'm busy", description: 'I stay emotionally steady even if I cannot help right away.', scores: { emotionalImpairment: 0 } },
          { key: 'B', text: 'I snap or react more sharply than the situation calls for', description: 'I may sound short, defensive, or visibly irritated over a small request.', scores: { emotionalImpairment: 2 } },
          { key: 'C', text: 'I feel a flash of frustration but keep it together', description: 'I feel internally annoyed, tense, or interrupted, even if I respond politely.', scores: { emotionalImpairment: 1 } },
        ],
      },
    ],
  },
  {
    id: 'scenario-3',
    order: 3,
    title: 'Team meeting',
    scenarioText: "You're in a team meeting to discuss an ongoing project.",
    questions: [
      {
        dimension: 'exhaustion',
        question: 'How do you feel sitting in the meeting?',
        choices: [
          { key: 'A', text: 'I feel present and engaged. I have enough energy to contribute', description: 'I can listen, think, and participate without feeling drained.', scores: { exhaustion: 0 } },
          { key: 'B', text: "I'm there physically but feel like I'm running on fumes", description: 'I feel tired, low-energy, or mentally slow, and may struggle to stay attentive.', scores: { exhaustion: 1 } },
          { key: 'C', text: "I'm counting down until it ends. I feel too drained to participate meaningfully", description: 'I may zone out, avoid speaking, or feel exhausted just trying to stay present.', scores: { exhaustion: 2 } },
        ],
      },
      {
        dimension: 'mentalDistancing',
        question: 'Your team is brainstorming ideas. What is your experience?',
        choices: [
          { key: 'A', text: 'I feel disconnected. None of it feels meaningful enough to engage with', description: 'I feel emotionally detached and may mentally check out of the conversation entirely.', scores: { mentalDistancing: 2 } },
          { key: 'B', text: "I'm genuinely interested and contribute ideas", description: 'I feel mentally involved and motivated to participate in the discussion.', scores: { mentalDistancing: 0 } },
          { key: 'C', text: "I follow along but don't feel motivated to add much", description: 'I contribute only when necessary and mostly stay passive.', scores: { mentalDistancing: 1 } },
        ],
      },
      {
        dimension: 'cognitiveImpairment',
        question: 'Someone asks for your input on something discussed earlier. What happens?',
        choices: [
          { key: 'A', text: 'I have to ask them to repeat it. I briefly zoned out', description: 'My attention drifts and I occasionally lose track of what is being discussed.', scores: { cognitiveImpairment: 1 } },
          { key: 'B', text: 'I recall it clearly and respond confidently', description: 'I can track the conversation and respond without difficulty.', scores: { cognitiveImpairment: 0 } },
          { key: 'C', text: "I can't remember what was said and struggle to form a coherent response", description: 'My mind feels blank or disorganized, making it hard to respond clearly.', scores: { cognitiveImpairment: 2 } },
        ],
      },
      {
        dimension: 'emotionalImpairment',
        question: 'A colleague challenges one of your ideas in front of the group. How do you respond?',
        choices: [
          { key: 'A', text: 'I feel a strong emotional reaction that feels out of proportion to what happened', description: 'I may feel embarrassed, angry, withdrawn, or emotionally overwhelmed by the interaction.', scores: { emotionalImpairment: 2 } },
          { key: 'B', text: 'I feel mildly defensive but keep it in check', description: 'I feel emotionally affected internally, but still respond professionally.', scores: { emotionalImpairment: 1 } },
          { key: 'C', text: 'I engage with their perspective calmly and openly', description: 'I can handle disagreement without feeling personally threatened or upset.', scores: { emotionalImpairment: 0 } },
        ],
      },
    ],
  },
]

export const DEFAULT_QUIZ_CONTENT: QuizContent = {
  questions: SCENARIOS,
  resultMappings: [
    {
      signal: 'Low',
      minScore: 0,
      maxScore: 8,
      title: 'Low burnout signal',
      description: 'Your responses suggest lower burnout pressure across these scenarios.',
      recommendation: 'Keep protecting the routines and recovery practices that help you stay steady.',
    },
    {
      signal: 'Moderate',
      minScore: 9,
      maxScore: 15,
      title: 'Moderate burnout signal',
      description: 'Your responses suggest burnout pressure may be showing up in some work moments.',
      recommendation: 'Consider where workload, recovery, boundaries, or support could be adjusted before strain becomes harder to reverse.',
    },
    {
      signal: 'High',
      minScore: 16,
      maxScore: 24,
      title: 'High burnout signal',
      description: 'Your responses suggest a stronger burnout signal across the scenarios.',
      recommendation: 'It may be worth seeking additional support and reducing avoidable pressure where possible.',
    },
  ],
  resources: [
    {
      id: 'low-check-in',
      title: 'Weekly capacity check-in',
      description: 'Set aside a few minutes each week to notice energy, focus, emotional steadiness, and recovery.',
      signal: 'Low',
      order: 1,
    },
    {
      id: 'moderate-boundaries',
      title: 'Boundary and workload review',
      description: 'Identify one source of preventable overload and one conversation that could reduce it.',
      signal: 'Moderate',
      order: 2,
    },
    {
      id: 'high-support',
      title: 'Add human support',
      description: 'Consider speaking with a trusted professional, manager, HR partner, therapist, or clinician if strain is affecting daily functioning.',
      signal: 'High',
      order: 3,
    },
  ],
}
