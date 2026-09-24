/**
 * Additional MCQs for the question pool, grouped by track. `aptitude` is a new
 * track (reasoning, quantitative, verbal and workplace judgement) that feeds
 * the Master and Employability Index assessments; it has no track assessment
 * of its own.
 *
 * Authoring format: `[topic, prompt, correctAnswer, [wrongA, wrongB, wrongC]]`.
 * Options are shuffled deterministically (seeded by the prompt) so the correct
 * answer is not always first, and `correctIndex` is computed rather than typed.
 * Seeding is idempotent because ids are content hashes of the prompt.
 */

const crypto = require('crypto');

function seeded(text) {
  let h = crypto.createHash('sha1').update(text).digest().readUInt32LE(0) || 1;
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}

function build([topic, prompt, answer, wrong]) {
  const rand = seeded(prompt);
  const options = [answer, ...wrong];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { kind: 'mcq', topic, prompt, options, correctIndex: options.indexOf(answer) };
}

const raw = {
  'core-cs': [
    ['Operating Systems', 'Which of the following is NOT one of the four necessary conditions for a deadlock?', 'Preemption of resources', ['Mutual exclusion', 'Hold and wait', 'Circular wait']],
    ['Operating Systems', 'What does an operating system save and restore during a context switch?', 'The CPU registers and program counter of the process', ['The full contents of the hard disk', 'Only the contents of the L3 cache', 'The BIOS settings']],
    ['Operating Systems', 'Thrashing in a virtual-memory system happens when:', 'The system spends more time swapping pages than executing processes', ['The CPU runs at 100% on a single process', 'Too many files are open at once', 'The disk runs out of free space']],
    ['Operating Systems', 'Among non-preemptive schedulers, which gives the minimum average waiting time when all burst times are known?', 'Shortest Job First', ['First-Come, First-Served', 'Round Robin', 'Priority scheduling with static priorities']],
    ['DBMS', 'Which normal form eliminates transitive dependencies of non-key attributes on the primary key?', 'Third Normal Form (3NF)', ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Fourth Normal Form (4NF)']],
    ['DBMS', 'In ACID, which property ensures concurrently running transactions do not interfere with each other?', 'Isolation', ['Atomicity', 'Consistency', 'Durability']],
    ['DBMS', 'Which SQL clause is used to filter groups after an aggregate function has been applied?', 'HAVING', ['WHERE', 'ORDER BY', 'DISTINCT']],
    ['DBMS', 'What is the main purpose of a foreign key?', 'To enforce a link to a key in another table and preserve referential integrity', ['To speed up full-table scans', 'To encrypt a column', 'To make a column auto-increment']],
    ['Computer Networks', 'Which OSI layer is responsible for end-to-end delivery and reliability between hosts?', 'Transport layer', ['Network layer', 'Data Link layer', 'Presentation layer']],
    ['Computer Networks', 'Which protocol translates a domain name such as trafy.ai into an IP address?', 'DNS', ['DHCP', 'ARP', 'SMTP']],
    ['Computer Networks', 'What is the default TCP port for HTTPS?', '443', ['80', '21', '8080']],
    ['Data Structures', 'What is the time complexity of searching for a key in a balanced binary search tree with n nodes?', 'O(log n)', ['O(1)', 'O(n)', 'O(n log n)']],
    ['Data Structures', 'Which data structure does breadth-first search use to hold the frontier?', 'Queue', ['Stack', 'Priority queue only', 'Hash set only']],
    ['OOP', 'Which object-oriented principle hides internal state and exposes behaviour through a public interface?', 'Encapsulation', ['Inheritance', 'Polymorphism', 'Composition']],
    ['System Design', 'What is the primary job of a load balancer?', 'Distribute incoming requests across multiple servers', ['Store session data permanently', 'Compile source code', 'Encrypt the database at rest']],
  ],

  cpp: [
    ['C++ Basics', 'What does sizeof(char) evaluate to in C++?', '1', ['2', '4', 'It depends on the compiler']],
    ['C++ Basics', 'Which keyword on a member function promises it will not modify the object it is called on?', 'const', ['static', 'mutable', 'volatile']],
    ['OOP in C++', 'What does declaring a base-class method virtual enable?', 'Runtime polymorphism through dynamic dispatch', ['Compile-time inlining only', 'Multiple inheritance', 'Automatic memory management']],
    ['Memory', 'Which smart pointer expresses exclusive ownership of a heap object?', 'std::unique_ptr', ['std::shared_ptr', 'std::weak_ptr', 'std::auto_ref']],
    ['C++ Basics', 'Which statement about C++ references is true?', 'A reference must be initialised and cannot later be reseated to another object', ['A reference can be null', 'A reference can be reassigned like a pointer', 'A reference always occupies heap memory']],
    ['STL', 'Which standard container offers average O(1) lookup by key?', 'std::unordered_map', ['std::map', 'std::list', 'std::deque']],
    ['Memory', 'What does RAII stand for in C++ practice?', 'Resource Acquisition Is Initialization: tie a resource to an object lifetime', ['Runtime Allocation of Inline Instances', 'Recursive Access to Internal Interfaces', 'Reference And Iterator Invalidation']],
    ['OOP in C++', 'What is true of a class containing a pure virtual function?', 'It is abstract and cannot be instantiated directly', ['It cannot have a constructor', 'It must be a template', 'All its methods must be static']],
    ['C++ Basics', 'What does declaring a data member static mean in a class?', 'One copy is shared by all instances', ['Each instance gets its own copy', 'The member cannot be read', 'It is stored only on the stack']],
    ['Memory', 'What is the result of calling delete twice on the same raw pointer?', 'Undefined behaviour', ['A guaranteed exception', 'The second call is silently ignored', 'Memory is zeroed safely']],
    ['Modern C++', 'What does std::move actually do?', 'Casts its argument to an rvalue reference so it can be moved from', ['Copies the object to a new address', 'Deletes the object', 'Locks the object for threads']],
    ['C++ Basics', 'What is the default access level of members of a struct in C++?', 'public', ['private', 'protected', 'It has no default']],
    ['C++ Basics', 'Which declaration makes p a constant pointer to int (the pointer cannot be reseated, the int can change)?', 'int* const p', ['const int* p', 'int const* p', 'const int& p']],
    ['STL', 'What is the guaranteed worst-case time complexity of std::sort since C++11?', 'O(n log n)', ['O(n)', 'O(n^2)', 'O(log n)']],
    ['Memory', 'Which operator allocates an array of 10 ints on the heap?', 'new int[10]', ['malloc int[10]', 'int new[10]', 'alloc(int, 10)']],
  ],

  java: [
    ['Java Basics', 'Which keyword prevents a class from being extended?', 'final', ['static', 'abstract', 'transient']],
    ['Collections', 'Which of these collections does not allow duplicate elements?', 'HashSet', ['ArrayList', 'LinkedList', 'Vector']],
    ['Java Basics', 'What is the difference between == and equals() when comparing two String objects?', '== compares references while equals() compares character content', ['They are always identical', '== compares content while equals() compares references', 'equals() compares only string length']],
    ['JVM', 'Why is Java called platform independent?', 'Source is compiled to bytecode that any compatible JVM can run', ['It compiles directly to each CPU\'s machine code', 'It has no compiler', 'It only runs on Windows']],
    ['Exceptions', 'Which exception is thrown when an array is accessed with an invalid index?', 'ArrayIndexOutOfBoundsException', ['NullPointerException', 'ClassCastException', 'NumberFormatException']],
    ['Java Basics', 'A static method in Java belongs to:', 'The class rather than any instance', ['Every object separately', 'The JVM heap only', 'The nearest interface']],
    ['Collections', 'Which interface must a class implement to define its natural sort order?', 'Comparable', ['Cloneable', 'Serializable', 'Iterable']],
    ['JVM', 'What does the garbage collector reclaim?', 'Memory of objects that are no longer reachable', ['Files that are closed', 'All static variables', 'CPU cores from idle threads']],
    ['Exceptions', 'Which of these is a checked exception?', 'IOException', ['NullPointerException', 'ArithmeticException', 'IllegalArgumentException']],
    ['OOP in Java', 'Method overloading is resolved at:', 'Compile time', ['Runtime only', 'Class-loading time', 'Garbage-collection time']],
    ['Java Basics', 'Which of these classes is immutable?', 'String', ['StringBuilder', 'ArrayList', 'HashMap']],
    ['Java Basics', 'What is the default value of an int instance variable?', '0', ['null', 'undefined', '-1']],
    ['Concurrency', 'What does the synchronized keyword guarantee?', 'Only one thread at a time can hold the lock and run the guarded code', ['The code runs faster', 'The code always runs on a new thread', 'Deadlocks become impossible']],
    ['Java Basics', 'Which of the following is NOT a primitive type in Java?', 'String', ['int', 'boolean', 'double']],
    ['Collections', 'What does a HashMap allow regarding null?', 'One null key and any number of null values', ['No nulls at all', 'Only null values', 'Multiple null keys']],
  ],

  python: [
    ['Python Basics', 'Which of these Python types is immutable?', 'tuple', ['list', 'dict', 'set']],
    ['Python Basics', 'What does len({1, 2, 2, 3}) return?', '3', ['4', '2', 'It raises an error']],
    ['Python Basics', 'What does list(range(3)) produce?', '[0, 1, 2]', ['[1, 2, 3]', '[0, 1, 2, 3]', '(0, 1, 2)']],
    ['Functions', 'What does applying @functools.lru_cache to a function do?', 'Caches return values so repeated calls with the same arguments are not recomputed', ['Runs the function on a separate thread', 'Makes the function private to its module', 'Converts the function into a generator']],
    ['Python Basics', 'What does the "is" operator compare?', 'Object identity', ['Value equality', 'Type names only', 'String length']],
    ['Functions', 'Which keyword turns a function into a generator?', 'yield', ['return', 'lambda', 'async']],
    ['Python Basics', 'What is the value of "abc"[::-1]?', '"cba"', ['"abc"', '"bca"', '"cab"']],
    ['Internals', 'What does the CPython Global Interpreter Lock (GIL) do?', 'Allows only one thread to execute Python bytecode at a time', ['Encrypts source files', 'Prevents any use of threads', 'Locks the file system']],
    ['OOP in Python', 'What is the role of __init__ in a class?', 'Initialises a newly created instance', ['Deletes the instance', 'Defines a static method', 'Imports the parent class']],
    ['Python Basics', 'Which keys can a dictionary use?', 'Any hashable object', ['Only strings', 'Only integers', 'Any object, including lists']],
    ['Python Basics', 'What does bool([]) evaluate to?', 'False', ['True', 'None', 'It raises TypeError']],
    ['Python Basics', 'After x = [1, 2, 3]; y = x; y.append(4), what is x?', '[1, 2, 3, 4]', ['[1, 2, 3]', '[4]', 'It raises an error']],
    ['Python Basics', 'What does [x * x for x in range(4)] evaluate to?', '[0, 1, 4, 9]', ['[1, 4, 9, 16]', '[0, 1, 2, 3]', '[0, 2, 4, 6]']],
    ['Exceptions', 'Which construct is used to handle exceptions in Python?', 'try / except', ['catch / throw', 'guard / rescue', 'on error goto']],
    ['Python Basics', 'What does the expression 7 // 2 evaluate to?', '3', ['3.5', '4', '2']],
  ],

  webdev: [
    ['HTML', 'Which HTML element is intended for a block of main navigation links?', '<nav>', ['<menu-list>', '<links>', '<section-nav>']],
    ['CSS', 'Which CSS declaration makes an element\'s width include its padding and border?', 'box-sizing: border-box', ['box-sizing: content-box', 'overflow: hidden', 'display: inline-block']],
    ['HTTP', 'Which HTTP status code means the requested resource was not found?', '404', ['200', '301', '500']],
    ['HTTP', 'Which HTTP method is idempotent and normally used to replace a resource entirely?', 'PUT', ['POST', 'HEAD', 'OPTIONS']],
    ['JavaScript', 'What is the main difference between let and var?', 'let is block-scoped while var is function-scoped', ['let is global while var is local', 'var is block-scoped', 'There is no difference']],
    ['JavaScript', 'What does typeof null return?', '"object"', ['"null"', '"undefined"', '"number"']],
    ['JavaScript', 'What does the === operator do?', 'Compares value and type without coercion', ['Compares only type', 'Assigns a value', 'Compares memory addresses only']],
    ['CSS', 'Which CSS feature applies styles conditionally based on viewport size?', 'Media queries', ['Pseudo-elements', 'CSS variables', 'Keyframes']],
    ['Web Security', 'A page on one origin calls an API on a different origin and the browser blocks it. Which mechanism decides whether that request is allowed?', 'CORS response headers such as Access-Control-Allow-Origin', ['The HTML lang attribute', 'The CSS z-index of the page', 'The size of the JSON payload']],
    ['HTTP', 'Which HTTP method is conventionally used to create a new resource in a REST API?', 'POST', ['GET', 'DELETE', 'HEAD']],
    ['React', 'Which React hook manages local state in a function component?', 'useState', ['useRoute', 'useFetch', 'useClass']],
    ['Browser Storage', 'How does localStorage differ from cookies?', 'localStorage data is not automatically sent with every HTTP request', ['localStorage expires after each request', 'localStorage is shared across all websites', 'localStorage can only store numbers']],
    ['Web Security', 'What does JWT stand for?', 'JSON Web Token', ['Java Web Toolkit', 'JavaScript Widget Template', 'Joint Web Transfer']],
    ['Browser', 'What does DOM stand for?', 'Document Object Model', ['Data Object Method', 'Dynamic Output Markup', 'Document Order Map']],
    ['JavaScript', 'Which are the three states of a JavaScript Promise?', 'Pending, fulfilled and rejected', ['Open, closed and locked', 'Ready, running and done', 'Queued, active and failed']],
  ],

  aiml: [
    ['ML Basics', 'What does overfitting mean?', 'The model fits training data very well but generalises poorly to unseen data', ['The model is too simple to learn anything', 'The model trains too fast', 'The dataset has too many features']],
    ['ML Basics', 'Which of these is a supervised learning task?', 'Predicting house prices from labelled examples', ['Grouping customers with no labels', 'Reducing image dimensions with no labels', 'Generating random noise']],
    ['ML Basics', 'Why do we hold out a test set?', 'To estimate performance on data the model has never seen', ['To make training faster', 'To increase the training set size', 'To remove outliers']],
    ['Optimisation', 'What does gradient descent do?', 'Iteratively updates parameters in the direction that reduces the loss', ['Randomly guesses new parameters', 'Sorts the training data', 'Removes correlated features']],
    ['Deep Learning', 'What does the ReLU activation function compute?', 'max(0, x)', ['1 / (1 + e^-x)', 'tanh(x)', 'x squared']],
    ['Evaluation', 'Which metric is generally more informative than accuracy on a heavily imbalanced classification problem?', 'F1-score (precision and recall)', ['Number of parameters', 'Training time', 'Learning rate']],
    ['ML Basics', 'k-means is an example of:', 'Unsupervised clustering', ['Supervised regression', 'Reinforcement learning', 'Semi-supervised classification']],
    ['Deep Learning', 'What does backpropagation compute?', 'Gradients of the loss with respect to the weights using the chain rule', ['The best learning rate', 'The number of layers', 'The test accuracy']],
    ['ML Basics', 'What is the effect of L2 regularisation?', 'It penalises large weights to reduce overfitting', ['It removes all features', 'It doubles the learning rate', 'It increases model variance']],
    ['ML Basics', 'Which technique is commonly used for dimensionality reduction?', 'Principal Component Analysis (PCA)', ['Gradient boosting', 'Dropout', 'Beam search']],
    ['NLP', 'Which mechanism is central to the Transformer architecture?', 'Self-attention', ['Convolution over pixels only', 'Decision stumps', 'Hidden Markov states']],
    ['Evaluation', 'Precision is defined as:', 'True positives / (true positives + false positives)', ['True positives / (true positives + false negatives)', 'True negatives / all samples', 'Correct predictions / total classes']],
    ['Optimisation', 'What is a likely effect of setting the learning rate far too high?', 'Training may overshoot the minimum and diverge', ['Training becomes perfectly stable', 'The model always converges faster to the optimum', 'Overfitting is impossible']],
    ['Evaluation', 'What is the purpose of k-fold cross-validation?', 'To estimate generalisation performance more reliably by rotating the validation set', ['To speed up prediction', 'To remove the need for a test set entirely', 'To add more training data']],
    ['NLP', 'What is tokenisation in NLP?', 'Splitting text into smaller units such as words or subwords', ['Translating text between languages', 'Removing all punctuation and numbers only', 'Encrypting text']],
  ],

  aptitude: [
    ['Quantitative', 'A 120 m long train crosses a pole in 6 seconds. What is its speed in km/h?', '72 km/h', ['20 km/h', '60 km/h', '120 km/h']],
    ['Quantitative', '5 workers finish a job in 12 days. At the same rate, how many days will 10 workers need?', '6 days', ['24 days', '10 days', '8 days']],
    ['Quantitative', 'What is 15% of 240?', '36', ['24', '32', '40']],
    ['Reasoning', 'What comes next in the series 2, 6, 12, 20, 30, ?', '42', ['40', '44', '36']],
    ['Reasoning', 'What comes next in the series 3, 9, 27, 81, ?', '243', ['162', '324', '108']],
    ['Quantitative', 'The average of five numbers is 20. When a sixth number is added, the average becomes 22. What is the sixth number?', '32', ['22', '42', '30']],
    ['Quantitative', 'An item bought for 400 is sold for 500. What is the profit percentage?', '25%', ['20%', '100%', '80%']],
    ['Quantitative', 'What is the simple interest on 5000 at 8% per annum for 3 years?', '1200', ['400', '1000', '1500']],
    ['Quantitative', 'Two fair dice are rolled. What is the probability that the sum is 7?', '1/6', ['1/12', '7/36', '1/7']],
    ['Reasoning', 'All engineers are graduates. All graduates are learners. Which conclusion must be true?', 'All engineers are learners', ['All learners are engineers', 'Some learners are not graduates', 'No graduate is an engineer']],
    ['Reasoning', 'If CAT is written as 3120 using letter positions (C=3, A=1, T=20), how is DOG written?', '4157', ['4177', '3157', '4158']],
    ['Reasoning', 'A is B\'s sister and B is C\'s father. How is A related to C?', 'Aunt', ['Mother', 'Grandmother', 'Cousin']],
    ['Reasoning', 'Facing north, you turn right and then right again. Which direction do you now face?', 'South', ['East', 'West', 'North']],
    ['Reasoning', 'What comes next in the pattern J, F, M, A, M, J, J, ?', 'A', ['S', 'O', 'J']],
    ['Verbal', 'Choose the word closest in meaning to "meticulous".', 'Careful', ['Careless', 'Hasty', 'Bold']],
    ['Verbal', 'Choose the antonym of "scarce".', 'Abundant', ['Rare', 'Limited', 'Meagre']],
    ['Workplace', 'A teammate disagrees with your proposed approach in a meeting. What is the most professional response?', 'Listen to the reasoning, discuss trade-offs and decide on merit', ['Insist on your approach because you proposed it', 'Stay silent and change nothing later', 'Escalate to management immediately']],
    ['Workplace', 'You realise you will miss a deadline because you depend on another team. What is the best first step?', 'Tell stakeholders early and share a revised plan', ['Wait and hope the other team finishes', 'Quietly cut quality to catch up', 'Blame the other team in public']],
    ['Quantitative', 'A car travels at 60 km/h for 2.5 hours. How far does it go?', '150 km', ['120 km', '140 km', '180 km']],
    ['Quantitative', 'If a:b = 2:3 and b:c = 4:5, what is a:c?', '8:15', ['2:5', '6:20', '10:12']],
  ],
};

const extra = Object.fromEntries(Object.entries(raw).map(([track, rows]) => [track, rows.map(build)]));

module.exports = extra;
