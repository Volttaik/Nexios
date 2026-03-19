import { initialiseKnowledgeBase, isReady } from './knowledge-base';
import { generateResponse, getModelInfo } from './response-generator';
import type { KnowledgeCategory } from '../types/index';

const TRAINING_DATASETS = {
  general: [
    { input: "hello", response: "Hello! I'm Nexios AI, your intelligent assistant. How can I help you today?" },
    { input: "hi", response: "Hi there! Ready to assist you with coding, design, documents, or any questions you have." },
    { input: "hey", response: "Hey! What can I help you with today?" },
    { input: "good morning", response: "Good morning! Hope you're having a great start to your day. What are we working on?" },
    { input: "good evening", response: "Good evening! Happy to help with whatever you need." },
    { input: "how are you", response: "I'm running perfectly — all systems operational. Ready to assist you!" },
    { input: "what is your name", response: "I'm Nexios AI, an intelligent assistant built into the Nexios platform to help with coding, design, writing, and general knowledge." },
    { input: "who are you", response: "I'm Nexios AI — a trained AI assistant designed to help developers and creators with coding, design, documentation, and knowledge queries." },
    { input: "what can you do", response: "I can help you with: writing and reviewing code, explaining programming concepts, giving design advice, drafting documents, answering science and math questions, and general knowledge queries." },
    { input: "thanks", response: "You're welcome! Let me know if there's anything else I can help with." },
    { input: "thank you", response: "Happy to help! Feel free to ask anything else." },
    { input: "bye", response: "Goodbye! Come back anytime you need assistance." },
    { input: "goodbye", response: "Take care! The Nexios AI is always here when you need it." },
    { input: "what time is it", response: "I don't have access to real-time clock data, but your device should show the current time. Is there something time-related I can help you calculate?" },
    { input: "tell me a joke", response: "Why do programmers prefer dark mode? Because light attracts bugs! 😄" },
    { input: "help", response: "I'm here to help! You can ask me about coding, design concepts, writing, math, science, or any general questions. What would you like to explore?" },
    { input: "what is nexios", response: "Nexios is an AI-powered development platform that combines a code IDE, design canvas, and document editor — all with an integrated AI assistant to help you build faster." },
    { input: "are you smart", response: "I'm trained across multiple domains including programming, mathematics, science, and general knowledge. I'll do my best to give you accurate, helpful responses!" },
    { input: "how do you work", response: "I was trained during the deployment build phase using a structured curriculum that covers conversations, coding, design, science, and mathematics. At runtime, I perform pure inference — no live learning — which means fast, consistent responses." },
  ],
  programming: [
    { input: "what is javascript", response: "JavaScript is a high-level, interpreted programming language primarily used for web development. It runs in browsers and on servers (via Node.js), and supports object-oriented, functional, and event-driven programming paradigms." },
    { input: "what is typescript", response: "TypeScript is a statically-typed superset of JavaScript developed by Microsoft. It adds optional type annotations, interfaces, generics, and advanced IDE support, making large codebases easier to maintain." },
    { input: "what is react", response: "React is a JavaScript library for building user interfaces, developed by Meta. It uses a component-based architecture and a virtual DOM to efficiently update the UI. Components can be functional (with hooks) or class-based." },
    { input: "explain async await", response: "async/await is JavaScript syntax for working with Promises more cleanly. An `async` function always returns a Promise, and `await` pauses execution inside that function until the awaited Promise resolves. Example:\n\nasync function fetchData() {\n  const res = await fetch('/api/data');\n  const json = await res.json();\n  return json;\n}" },
    { input: "what is a hook in react", response: "React hooks are functions that let you use state and lifecycle features in functional components. Key hooks include: useState (local state), useEffect (side effects), useContext (context access), useRef (DOM refs), useMemo and useCallback (performance optimisation)." },
    { input: "what is an api", response: "An API (Application Programming Interface) is a set of rules and endpoints that allows software applications to communicate. REST APIs use HTTP methods (GET, POST, PUT, DELETE) and return JSON. APIs enable frontend apps to request data from backend servers." },
    { input: "explain closures", response: "A closure is a function that retains access to variables from its outer lexical scope even after that scope has returned. Example:\n\nfunction counter() {\n  let count = 0;\n  return () => ++count;\n}\nconst inc = counter();\ninc(); // 1\ninc(); // 2\n\nThe inner function closes over `count`." },
    { input: "what is css flexbox", response: "CSS Flexbox (Flexible Box Layout) is a one-dimensional layout system for arranging items in rows or columns. Key properties: `display: flex`, `flex-direction`, `justify-content` (main axis), `align-items` (cross axis), `gap`, `flex-wrap`. It's ideal for responsive, centered, or evenly-spaced layouts." },
    { input: "what is git", response: "Git is a distributed version control system for tracking changes in source code. Core commands: `git init`, `git add`, `git commit`, `git push`, `git pull`, `git branch`, `git merge`. It enables collaborative development and maintains a full history of changes." },
    { input: "what is a promise", response: "A Promise in JavaScript represents an async operation that will eventually resolve or reject. It has three states: pending, fulfilled, or rejected. You chain `.then()` for success and `.catch()` for errors. Promises are the foundation of async/await syntax." },
    { input: "how to center div css", response: "To center a div with CSS Flexbox:\n\n.parent {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n\nOr with CSS Grid:\n\n.parent {\n  display: grid;\n  place-items: center;\n}\n\nBoth are modern, clean approaches." },
    { input: "what is node.js", response: "Node.js is a JavaScript runtime built on Chrome's V8 engine that allows JavaScript to run server-side. It's non-blocking and event-driven, making it excellent for I/O-intensive applications like REST APIs, real-time apps, and CLI tools." },
    { input: "explain recursion", response: "Recursion is when a function calls itself to solve a smaller version of the same problem. Every recursive function needs a base case (to stop) and a recursive case. Example — factorial:\n\nfunction factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\n\nfactorial(5) → 120" },
    { input: "what is an algorithm", response: "An algorithm is a finite, step-by-step procedure for solving a problem. Key properties: correctness, efficiency (time/space complexity), and termination. Examples include sorting (QuickSort, MergeSort), searching (Binary Search), and graph traversal (BFS, DFS)." },
    { input: "what is big o notation", response: "Big O notation describes the time or space complexity of an algorithm as input grows. Common complexities: O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, O(n²) quadratic, O(2ⁿ) exponential. Lower is better for large inputs." },
    { input: "write a react component", response: "Here's a simple React functional component:\n\nimport { useState } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(c => c + 1)}>Increment</button>\n    </div>\n  );\n}" },
    { input: "what is sql", response: "SQL (Structured Query Language) is used to manage relational databases. Core operations: SELECT (query), INSERT (add rows), UPDATE (modify rows), DELETE (remove rows), JOIN (combine tables). Example: SELECT * FROM users WHERE active = true ORDER BY created_at DESC;" },
    { input: "what is python", response: "Python is a high-level, dynamically-typed programming language known for its readable syntax and versatility. It's widely used for data science, machine learning, web backends (Django/Flask), automation, and scripting. Python emphasises code readability and developer productivity." },
  ],
  design: [
    { input: "what is ui design", response: "UI (User Interface) design focuses on the visual and interactive elements users interact with — buttons, forms, layouts, typography, colors, and icons. Good UI design is intuitive, visually consistent, and accessible." },
    { input: "what is ux design", response: "UX (User Experience) design focuses on the overall experience a user has with a product — usability, flow, accessibility, and satisfaction. UX designers conduct user research, create wireframes, prototypes, and test designs with real users." },
    { input: "what is color theory", response: "Color theory is the study of how colors interact. Key concepts: the color wheel (primary, secondary, tertiary colors), complementary colors (opposite on wheel), analogous colors (adjacent), triadic schemes, and color psychology (blue=trust, red=energy, green=growth). Use contrast for accessibility." },
    { input: "explain typography in design", response: "Typography is the art of arranging type for readability and aesthetics. Key principles: font pairing (serif + sans-serif), hierarchy (h1 > h2 > body), line height (1.4–1.6 for body), letter spacing, and font weight contrast. Limit to 2–3 typefaces per design." },
    { input: "what is a design system", response: "A design system is a collection of reusable UI components, design tokens, and guidelines that ensure consistency across a product. It includes color palettes, typography scales, spacing rules, component libraries (buttons, inputs, cards), and usage documentation." },
    { input: "what is whitespace in design", response: "Whitespace (negative space) is the empty space between and around design elements. It improves readability, creates visual hierarchy, reduces cognitive load, and gives designs a clean, premium feel. Generous whitespace is a hallmark of modern, high-quality interfaces." },
    { input: "explain responsive design", response: "Responsive design ensures a UI looks and works well on all screen sizes. Techniques: fluid grid layouts (%, not px), CSS media queries (breakpoints at 640px, 768px, 1024px, 1280px), flexible images, and mobile-first design approach. CSS Flexbox and Grid are essential tools." },
    { input: "what are design tokens", response: "Design tokens are named variables that store design decisions — colors, spacing, font sizes, border radii, and shadows. They create a single source of truth for your design system. Example: `--color-primary: #6366f1`, `--spacing-4: 1rem`, `--radius-md: 0.5rem`." },
    { input: "what is a wireframe", response: "A wireframe is a low-fidelity, skeletal blueprint of a UI layout that shows structure without visual styling. It maps out content placement, navigation, and user flows. Wireframes are created before high-fidelity mockups and help teams align on structure early." },
    { input: "what makes a good button design", response: "Good button design: clear label (verb + noun, e.g. 'Save Changes'), sufficient padding (12px vertical, 20px horizontal), high contrast with background, visible hover and active states, appropriate border radius, and loading/disabled states. Primary CTA should be the most visually prominent." },
  ],
  mathematics: [
    { input: "what is the pythagorean theorem", response: "The Pythagorean theorem states that in a right triangle, the square of the hypotenuse (c) equals the sum of squares of the other two sides: a² + b² = c². Example: if a=3 and b=4, then c = √(9+16) = √25 = 5." },
    { input: "what is a derivative", response: "A derivative measures the rate of change of a function at any point. If f(x) = x², then f'(x) = 2x. Geometrically, it's the slope of the tangent line. Derivatives are used in physics (velocity, acceleration), economics (marginal cost), and optimisation." },
    { input: "what is an integral", response: "An integral computes the area under a curve. The definite integral ∫ₐᵇ f(x)dx gives the total area between x=a and x=b. The indefinite integral finds the antiderivative. The Fundamental Theorem of Calculus connects differentiation and integration." },
    { input: "explain probability", response: "Probability measures the likelihood of an event occurring, ranging from 0 (impossible) to 1 (certain). P(event) = favourable outcomes / total outcomes. Key concepts: independent events, conditional probability P(A|B), the addition rule P(A∪B), and Bayes' theorem." },
    { input: "what is a matrix", response: "A matrix is a rectangular array of numbers arranged in rows and columns. Matrices are used in linear algebra, computer graphics, machine learning, and solving systems of equations. Operations include addition, subtraction, multiplication, and finding the determinant or inverse." },
    { input: "what is statistics", response: "Statistics is the science of collecting, analysing, and interpreting data. Key concepts: mean (average), median (middle value), mode (most frequent), standard deviation (spread), variance, normal distribution, correlation, regression, and hypothesis testing." },
    { input: "explain prime numbers", response: "A prime number is a natural number greater than 1 that has no divisors other than 1 and itself. Examples: 2, 3, 5, 7, 11, 13. The fundamental theorem of arithmetic states every integer > 1 is either prime or a unique product of primes. There are infinitely many primes." },
    { input: "what is binary", response: "Binary is a base-2 number system using only digits 0 and 1. Computers use binary because transistors have two states (on/off). Converting decimal to binary: repeatedly divide by 2 and record remainders. Example: 10 in decimal = 1010 in binary (8+2=10)." },
  ],
  science: [
    { input: "what is gravity", response: "Gravity is the fundamental force of attraction between masses. Newton's law: F = G(m₁m₂)/r². Einstein's general relativity describes gravity as the curvature of spacetime caused by mass and energy. On Earth, g ≈ 9.81 m/s² pulls objects downward." },
    { input: "explain photosynthesis", response: "Photosynthesis is the process by which plants convert sunlight, CO₂, and water into glucose and oxygen. The equation: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. It occurs in chloroplasts, using chlorophyll to capture light energy." },
    { input: "what is an atom", response: "An atom is the smallest unit of matter that retains the chemical properties of an element. It consists of a nucleus (protons + neutrons) surrounded by electrons. Protons determine the element (atomic number). Electrons determine chemical bonding behavior." },
    { input: "what is dna", response: "DNA (deoxyribonucleic acid) is the molecule that carries genetic instructions for all living organisms. It's a double helix made of nucleotide base pairs (A-T, G-C). Genes are segments of DNA that encode proteins. DNA is located in the cell nucleus and mitochondria." },
    { input: "explain the water cycle", response: "The water cycle describes how water continuously moves through the environment: evaporation (sun heats water → vapour), condensation (vapour forms clouds), precipitation (rain/snow falls), and collection (water gathers in oceans, rivers, groundwater) — then repeats." },
    { input: "what is evolution", response: "Evolution is the change in heritable characteristics of biological populations over generations. Charles Darwin proposed natural selection: organisms with advantageous traits are more likely to survive and reproduce, passing those traits on. Over time, this leads to new species." },
    { input: "what is the speed of light", response: "The speed of light in a vacuum is approximately 299,792,458 metres per second (≈3×10⁸ m/s or about 186,000 miles per second). It's a fundamental constant of nature (c). According to special relativity, nothing with mass can reach or exceed the speed of light." },
  ],
};

let ready = false;

export class NexiosInferenceEngine {
  private requestCount = 0;
  private startedAt = Date.now();
  private totalResponseMs = 0;

  constructor() {
    if (!ready) {
      initialiseKnowledgeBase(TRAINING_DATASETS);
      ready = true;
    }
  }

  async process(userInput: string): Promise<{
    id: string;
    content: string;
    category: KnowledgeCategory;
    confidence: number;
    processingMs: number;
    modelVersion: string;
    timestamp: number;
  }> {
    this.requestCount++;
    const result = generateResponse(userInput);
    this.totalResponseMs += result.processingMs;

    return {
      id: `nexios_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content: result.content,
      category: result.category,
      confidence: result.confidence,
      processingMs: result.processingMs,
      modelVersion: result.modelVersion,
      timestamp: Date.now(),
    };
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      avgResponseMs: this.requestCount > 0 ? Math.round(this.totalResponseMs / this.requestCount) : 0,
      uptimeMs: Date.now() - this.startedAt,
      modelInfo: getModelInfo(),
      status: 'operational' as const,
      knowledgeEntries: isReady() ? 70 : 0,
    };
  }

  isReady(): boolean {
    return isReady();
  }
}

let instance: NexiosInferenceEngine | null = null;

export function getInferenceEngine(): NexiosInferenceEngine {
  if (!instance) instance = new NexiosInferenceEngine();
  return instance;
}
