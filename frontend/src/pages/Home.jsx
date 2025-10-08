import React from 'react';
import { TypeAnimation } from 'react-type-animation';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  BarChart3,
  ArrowRight,
  MessageSquare,
  Github,
  Twitter,
  Linkedin,
  Menu,
  X,
  BrainCircuit,
  FileJson,
  Bot,
  FileText,
  Share2,
  Code,
  Server,
  PieChart,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// --- Interactive Demo Component for Hero Section ---
const InteractiveDemo = () => {
  const [step, setStep] = React.useState(0);
  const fullText =
    'Show me the total sales per product category for the last quarter.';

  const steps = [
    { type: 'user' },
    { type: 'ai_thinking' },
    { type: 'code' },
    { type: 'ai_generating_answer' },
    { type: 'chart' },
  ];

  // Main interval to cycle through steps
  React.useEffect(() => {
    const timings = [4000, 2500, 4000, 2500, 5000]; // Duration for each step
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, timings[step]);
    return () => clearInterval(interval);
  }, [step, steps.length]);

  const currentStep = steps[step];
  const chartData = [
    { label: 'Electronics', value: 80 },
    { label: 'Books', value: 60 },
    { label: 'Home Goods', value: 45 },
  ];

  return (
    <Card className="relative w-full max-w-4xl mx-auto bg-black/60 backdrop-blur-sm shadow-2xl p-0 border-white/20 overflow-hidden">
      <div className="p-3 bg-black/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-sm text-gray-400">/ intelli_query / demo</div>
      </div>
      <div className="p-6 text-left font-mono text-sm h-[380px] flex flex-col">
        {/* Always show the user prompt after it has been typed */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-green-400 flex-shrink-0">&gt;</span>
          <p className="text-gray-300">
            {step === 0 ? (
              <TypeAnimation
                sequence={[fullText]}
                wrapper="span"
                speed={60}
                cursor={true}
                style={{ display: 'inline-block' }}
              />
            ) : (
              fullText
            )}
          </p>
        </div>

        <div className="flex-grow relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {currentStep.type === 'ai_thinking' && (
                <div className="flex items-center gap-3 text-purple-400">
                  <Bot className="w-5 h-5 animate-pulse" />
                  <span>
                    [IntelliQuery]: Accessing knowledge base... Generating
                    MQL...
                  </span>
                </div>
              )}
              {currentStep.type === 'code' && (
                <div>
                  <p className="text-purple-400 mb-2">
                    [IntelliQuery]: Generated the following MQL Aggregation:
                  </p>
                  <pre className="p-4 bg-black/40 rounded-lg text-xs text-white overflow-x-auto border border-white/10">
                    <code>
                      <span className="text-blue-400">db.sales.aggregate</span>
                      ([
                      <br />
                      {'  '}
                      {'{'}
                      <span className="text-red-400"> $match</span>: {'{'}{' '}
                      "date": {'{'} <span className="text-red-400">$gte</span>:{' '}
                      <span className="text-green-400">new Date(...)</span>{' '}
                      {'}'} {'}'} {'}'},<br />
                      {'  '}
                      {'{'}
                      <br />
                      {'    '}
                      <span className="text-red-400">$group</span>: {'{'}
                      <br />
                      {'      '}_id:{' '}
                      <span className="text-green-400">"$category"</span>,<br />
                      {'      '}totalSales: {'{'}{' '}
                      <span className="text-red-400">$sum</span>:{' '}
                      <span className="text-green-400">"$amount"</span> {'}'}{' '}
                      {'}'}
                      <br />
                      {'    '}
                      {'}'}
                      <br />
                      {'  '}
                      {'}'}
                      <br />
                      ])
                    </code>
                  </pre>
                </div>
              )}
              {currentStep.type === 'ai_generating_answer' && (
                <div className="flex items-center gap-3 text-purple-400">
                  <Bot className="w-5 h-5 animate-pulse" />
                  <span>
                    [IntelliQuery]: Query executed... Generating insights...
                  </span>
                </div>
              )}
              {currentStep.type === 'chart' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <p className="text-purple-400 mb-2">
                    [IntelliQuery]: Here is your answer:
                  </p>
                  <p className="text-gray-300 text-sm mb-4 whitespace-pre-wrap font-sans">
                    Based on the analysis, the "Electronics" category had the
                    highest sales last quarter, followed by "Books" and "Home
                    Goods."
                  </p>
                  <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                    <div className="w-full h-40 flex items-end justify-around gap-4 px-4">
                      {chartData.map((item, index) => (
                        <div
                          key={item.label}
                          className="h-full flex-1 flex flex-col justify-end items-center"
                        >
                          <motion.div
                            initial={{ height: '0%' }}
                            animate={{ height: `${item.value}%` }}
                            transition={{
                              duration: 0.5,
                              delay: index * 0.2,
                              type: 'spring',
                            }}
                            className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-md"
                          />
                          <p className="text-xs text-gray-400 mt-2 flex-shrink-0">
                            {item.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
};

// --- Main App Component ---
export default function App() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'AI Core', href: '#ai-core' },
    { name: 'Tech Stack', href: '#tech' },
    { name: 'Quickstart', href: '#quickstart' },
  ];

  const faqs = [
    {
      q: 'How does IntelliQuery understand my database schema?',
      a: "You provide a simple JSON file defining your collections, fields, and their meanings during a one-time setup. Our AI engine processes this file to create a semantic 'knowledge base' of your data structure, enabling it to understand context when you ask questions.",
    },
    {
      q: 'Is my data secure?',
      a: 'Absolutely. IntelliQuery does not store your actual database data. It only stores the schema definition you provide in a secure, isolated, multi-tenant environment. All database credentials are encrypted using industry-standard practices.',
    },
    {
      q: 'What kind of questions can I ask?',
      a: "You can ask anything from simple queries like 'show me all users from New York' to complex analytical questions like 'what was the monthly sales growth for product X in the last year?'. The AI translates your query into the appropriate MongoDB aggregation pipeline.",
    },
    {
      q: 'Can I use this with my existing BI tools?',
      a: 'While IntelliQuery provides its own dynamic visualizations, you can export the generated MQL or the resulting data in JSON format to use in other tools like Tableau or Looker for further analysis.',
    },
  ];

  const schemaJsonExample = `{
  "databaseName": "ecommerce_db",
  "collections": [
    {
      "name": "users",
      "description": "Stores customer information.",
      "fields": [
        { "name": "userId", "type": "ObjectId", "description": "Unique user identifier" },
        { "name": "email", "type": "string", "description": "Customer's email address" },
        { "name": "signupDate", "type": "date", "description": "When the user registered" }
      ]
    },
    {
      "name": "orders",
      "description": "Stores information about customer orders.",
      "fields": [
        { "name": "orderId", "type": "ObjectId", "description": "Unique order identifier" },
        { "name": "amount", "type": "number", "description": "Total order value" },
        { "name": "purchaseDate", "type": "date", "description": "Date of the order" }
      ]
    }
  ]
}`;

  const techStack = [
    {
      category: 'Frontend',
      icon: <Code />,
      technologies: [
        {
          name: 'React / Next.js',
          description: 'For a modern, performant UI.',
        },
        { name: 'Tailwind CSS', description: 'For utility-first styling.' },
        { name: 'Framer Motion', description: 'For beautiful animations.' },
      ],
    },
    {
      category: 'Backend & Database',
      icon: <Server />,
      technologies: [
        {
          name: 'Node.js / Express',
          description: 'Handles API requests and orchestration.',
        },
        {
          name: 'MongoDB Atlas',
          description: 'Primary application and vector database.',
        },
        { name: 'Mongoose', description: 'Object Data Modeling for MongoDB.' },
      ],
    },
    {
      category: 'AI & Orchestration',
      icon: <BrainCircuit />,
      technologies: [
        {
          name: 'Google Gemini / GPT-4',
          description: 'State-of-the-art Text-to-MQL generation.',
        },
        {
          name: 'LangChain.js',
          description: 'Manages the entire RAG pipeline.',
        },
        {
          name: 'Vector Search',
          description: 'For efficient semantic context retrieval.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#020817] text-white overflow-x-hidden antialiased">
      <div className="fixed top-0 left-0 w-full h-full -z-10 opacity-50">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-purple-500/30 rounded-full filter blur-3xl animate-blob"></div>
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[5%] left-[25%] w-[400px] h-[400px] bg-pink-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/" className="group flex items-center gap-2 select-none">
            <div className="relative flex items-center justify-center">
              <div className="relative mx-1 flex items-center justify-center">
                <BrainCircuit className="relative h-7 w-7 text-cyan-400 " />
              </div>
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-lg sm:text-xl font-bold tracking-tight">
                IntelliQuery
              </span>
              <span className="text-[11px] text-gray-400 group-hover:text-gray-100 transition-colors">
                AI Data Analyst
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-300 hover:text-primary transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-white text-black hover:bg-gray-200">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden bg-background/80 backdrop-blur-lg">
            <nav className="flex flex-col items-center space-y-4 p-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-lg font-medium text-gray-300 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col w-full items-center gap-4 pt-4 border-t border-white/10">
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-white text-black hover:bg-gray-200 w-full">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 md:px-6">
        <section className="py-24 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-gray-50 to-gray-400 leading-normal">
              Your AI Data Analyst for MongoDB
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-300">
              IntelliQuery is a self-configuring AI that transforms natural
              language questions into powerful MongoDB queries and rich
              visualizations. No MQL required.
            </p>
            <div className="mt-8 flex justify-center">
              <Link to="/signup">
                <Button className="w-full sm:w-auto text-lg px-8 py-6 bg-white text-black hover:bg-gray-200">
                  Start For Free
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="mt-16 relative max-w-4xl mx-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-20"></div>
              <InteractiveDemo />
            </div>
          </motion.div>
        </section>

        <section id="features" className="py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              The Modern Way to Analyze Data
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-400">
              IntelliQuery simplifies your entire data workflow, from onboarding
              to insight.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FeatureCardBento
              icon={<FileJson className="h-8 w-8 text-primary" />}
              title="Schema-Driven Onboarding"
              description="Connect your database in minutes via a simple JSON file. No code access needed, ensuring maximum security."
            />
            <FeatureCardBento
              icon={<MessageSquare className="h-8 w-8 text-primary" />}
              title="Natural Language to MQL"
              description="Ask complex questions in plain English. Our AI core translates them into accurate, optimized MongoDB queries."
              className="lg:col-span-2"
            />
            <FeatureCardBento
              icon={<PieChart className="h-8 w-8 text-primary" />}
              title="Dynamic Visualizations"
              description="Get answers rendered as interactive charts, tables, and JSON, ready for your dashboards and reports."
              className="lg:col-span-2"
            />
            <FeatureCardBento
              icon={<ShieldCheck className="h-8 w-8 text-primary" />}
              title="Secure & Isolated"
              description="Your data and schema are securely stored in a dedicated, multi-tenant workspace with robust access controls."
            />
          </div>
        </section>

        <section id="how-it-works" className="py-20 md:py-28">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-400">
              Transform your data into insights through a seamless, three-step
              process.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            <HowItWorksCard
              icon={<FileJson className="w-10 h-10" />}
              step="Step 1: Connect"
              title="Provide Your Schema"
              description="Securely connect your MongoDB instance and upload a simple JSON file that defines your data structure. No code access, no complex setup."
            />
            <ArrowRight className="w-8 h-8 text-white/30 rotate-90 md:rotate-0" />
            <HowItWorksCard
              icon={<MessageSquare className="w-10 h-10" />}
              step="Step 2: Query"
              title="Ask in Plain English"
              description="Use our intuitive chat interface to ask any question about your data. From simple lookups to complex analytical queries."
            />
            <ArrowRight className="w-8 h-8 text-white/30 rotate-90 md:rotate-0" />
            <HowItWorksCard
              icon={<BarChart3 className="w-10 h-10" />}
              step="Step 3: Visualize"
              title="Get Instant Insights"
              description="Receive answers as dynamic charts, tables, and raw JSON. Export visualizations and dive deeper with follow-up questions."
            />
          </div>
        </section>

        <section id="ai-core" className="py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Under the Hood: The AI Core
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-400">
              We use a Retrieval-Augmented Generation (RAG) pipeline to ensure
              query accuracy and context-awareness.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center items-start">
            <AiCoreStep
              icon={<FileText />}
              title="1. Knowledge Base Creation"
              description="Your schema JSON is converted into semantic vector embeddings and stored in a vector database. This becomes the AI's long-term memory about your data structure."
            />
            <AiCoreStep
              icon={<Share2 />}
              title="2. Contextual Retrieval"
              description="When you ask a question, we first search the vector database to find the most relevant parts of your schema. This context is then passed to the LLM."
            />
            <AiCoreStep
              icon={<Bot />}
              title="3. Accurate Generation"
              description="The LLM (Gemini/GPT-4), now equipped with precise context, generates an accurate and optimized MongoDB query to answer your specific question."
            />
          </div>
        </section>

        <section id="tech" className="py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Built on a Modern, Powerful Stack
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-400">
              Leveraging the best-in-class technologies for performance,
              security, and intelligence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {techStack.map((category) => (
              <TechCategoryCard key={category.category} {...category} />
            ))}
          </div>
        </section>

        <section id="quickstart" className="py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Get Started in 60 Seconds
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-400">
              All you need is a simple JSON file to define your data. Here’s an
              example:
            </p>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-20"></div>
            <pre className="relative p-6 bg-black/80 border border-white/20 rounded-lg text-sm text-white overflow-x-auto">
              <code>{schemaJsonExample}</code>
            </pre>
          </div>
        </section>

        <section id="faq" className="py-20 md:py-28 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-400">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="my-20 md:my-28">
          <div className="relative rounded-2xl p-10 md:p-16 text-center overflow-hidden bg-gradient-to-r from-gray-900 to-black border border-white/10">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https/www.transparenttextures.com/patterns/grid.png')] opacity-5"></div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Unlock Your Data's Potential?
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-gray-400">
              Join now and start transforming your MongoDB data into actionable
              insights in minutes.
            </p>
            <div className="mt-8">
              <Link to="/signup">
                <Button className="text-lg px-8 py-4 bg-white text-black hover:bg-gray-200">
                  Sign Up for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 py-12 px-4 md:px-6 text-sm">
          <div className="flex flex-col gap-4 items-start">
            <a href="#" className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">IntelliQuery</span>
            </a>
            <p className="text-gray-400">AI Data Analyst for MongoDB</p>
            <div className="flex gap-4 mt-2">
              <a href="#" className="text-gray-400 hover:text-white">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-gray-400 hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#quickstart"
                  className="text-gray-400 hover:text-white"
                >
                  Quickstart
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Changelog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-6">
          <p className="text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} IntelliQuery. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const FeatureCardBento = ({ icon, title, description, className }) => (
  <Card
    className={`bg-black/30 border-white/10 p-6 flex flex-col gap-4 hover:border-primary/50 hover:-translate-y-1 transition-transform duration-300 ease-in-out ${className}`}
  >
    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </Card>
);

const HowItWorksCard = ({ icon, step, title, description }) => (
  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center max-w-xs flex flex-col items-center">
    <div className="text-primary mb-4">{icon}</div>
    <p className="text-sm font-semibold text-primary mb-2">{step}</p>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

const AiCoreStep = ({ icon, title, description }) => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
      {React.cloneElement(icon, { className: 'w-8 h-8 text-primary' })}
    </div>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-gray-400">{description}</p>
  </div>
);

const TechCategoryCard = ({ category, icon, technologies }) => (
  <Card className="bg-black/30 border-white/10 p-6">
    <div className="flex items-center gap-4 mb-4">
      <div className="text-primary">
        {React.cloneElement(icon, { className: 'w-8 h-8' })}
      </div>
      <h3 className="text-xl font-bold">{category}</h3>
    </div>
    <ul className="space-y-3">
      {technologies.map((tech) => (
        <li key={tech.name}>
          <p className="font-semibold text-white">{tech.name}</p>
          <p className="text-sm text-gray-400">{tech.description}</p>
        </li>
      ))}
    </ul>
  </Card>
);
