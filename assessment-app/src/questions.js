// Questions Data

// ── Core CS ──────────────────────────────────────────────────────────────────
const coreCS = [
  {
    id:"q1", kind:"mcq", topic:"Operating Systems",
    prompt:"Which CPU scheduling algorithm can lead to starvation of low-priority processes?",
    options:["First-Come, First-Served","Round Robin","Priority Scheduling","Shortest Job Next"],
    correctIndex:2
  },
  {
    id:"q2", kind:"mcq", topic:"Operating Systems",
    prompt:"What is a deadlock in an operating system?",
    options:["A process consuming 100% CPU","A situation where two or more processes wait indefinitely for each other to release resources","Memory allocation failure","An infinite loop in user code"],
    correctIndex:1
  },
  {
    id:"q3", kind:"mcq", topic:"Operating Systems",
    prompt:"Which page replacement algorithm is guaranteed to have the lowest page fault rate?",
    options:["LRU (Least Recently Used)","FIFO (First In First Out)","OPT (Optimal)","LFU (Least Frequently Used)"],
    correctIndex:2
  },
  {
    id:"q4", kind:"mcq", topic:"DBMS",
    prompt:"Which normal form eliminates transitive functional dependencies?",
    options:["1NF","2NF","3NF","BCNF"],
    correctIndex:2
  },
  {
    id:"q5", kind:"mcq", topic:"DBMS",
    prompt:"In SQL, what does the HAVING clause do?",
    options:["Filters rows before grouping","Filters rows after the GROUP BY clause","Sorts the result set","Creates an index"],
    correctIndex:1
  },
  {
    id:"q6", kind:"mcq", topic:"DBMS",
    prompt:"Which of the following is NOT a property of a transaction (ACID)?",
    options:["Atomicity","Concurrency","Isolation","Durability"],
    correctIndex:1
  },
  {
    id:"q7", kind:"mcq", topic:"Computer Networks",
    prompt:"Which layer of the OSI model is responsible for routing packets between networks?",
    options:["Data Link Layer","Transport Layer","Network Layer","Session Layer"],
    correctIndex:2
  },
  {
    id:"q8", kind:"mcq", topic:"Computer Networks",
    prompt:"What is the main difference between TCP and UDP?",
    options:["TCP is faster","UDP provides reliable, ordered delivery","TCP provides reliable, ordered delivery while UDP does not","UDP is used only for file transfer"],
    correctIndex:2
  },
  {
    id:"q9", kind:"mcq", topic:"Computer Networks",
    prompt:"What does DNS stand for and what does it do?",
    options:["Data Network Service – stores files","Domain Name System – translates domain names to IP addresses","Digital Number Scheme – assigns port numbers","Direct Node Service – manages network nodes"],
    correctIndex:1
  },
  {
    id:"q10", kind:"mcq", topic:"DSA",
    prompt:"What is the time complexity of binary search on a sorted array of n elements?",
    options:["O(n)","O(n²)","O(log n)","O(n log n)"],
    correctIndex:2
  },
  {
    id:"q11", kind:"mcq", topic:"DSA",
    prompt:"Which data structure uses LIFO (Last In, First Out) order?",
    options:["Queue","Heap","Stack","Linked List"],
    correctIndex:2
  },
  {
    id:"q12", kind:"mcq", topic:"DSA",
    prompt:"What is the worst-case time complexity of QuickSort?",
    options:["O(n log n)","O(n²)","O(n)","O(log n)"],
    correctIndex:1
  },
  {
    id:"q13", kind:"mcq", topic:"OOP",
    prompt:"Which OOP principle allows a subclass to provide a specific implementation of a method already defined in its parent class?",
    options:["Encapsulation","Abstraction","Polymorphism","Inheritance"],
    correctIndex:2
  },
  {
    id:"q14", kind:"mcq", topic:"OOP",
    prompt:"What is encapsulation in OOP?",
    options:["Creating multiple classes","Hiding internal implementation details and exposing only necessary interfaces","Inheriting from multiple classes","Overloading methods"],
    correctIndex:1
  },
  {
    id:"q15", kind:"mcq", topic:"System Design",
    prompt:"What is a load balancer used for?",
    options:["To store data redundantly","To distribute incoming network traffic across multiple servers","To compress data for faster transmission","To encrypt data in transit"],
    correctIndex:1
  },
  {
    id:"q16", kind:"mcq", topic:"System Design",
    prompt:"Which caching strategy updates the cache when data is written?",
    options:["Cache-aside","Write-through","Read-through","Lazy loading"],
    correctIndex:1
  },
  {
    id:"q17", kind:"mcq", topic:"Operating Systems",
    prompt:"What is virtual memory?",
    options:["RAM installed on the graphics card","A technique that uses disk space to extend the apparent size of RAM","A reserved section of physical RAM","Memory shared between processes"],
    correctIndex:1
  },
  {
    id:"q18", kind:"mcq", topic:"DBMS",
    prompt:"Which type of SQL JOIN returns all records from both tables, filling NULL where there are no matches?",
    options:["INNER JOIN","LEFT JOIN","RIGHT JOIN","FULL OUTER JOIN"],
    correctIndex:3
  },
  {
    id:"q19", kind:"mcq", topic:"Computer Networks",
    prompt:"At which OSI layer does a switch operate?",
    options:["Layer 1 – Physical","Layer 2 – Data Link","Layer 3 – Network","Layer 4 – Transport"],
    correctIndex:1
  },
  {
    id:"q20", kind:"mcq", topic:"DSA",
    prompt:"Which algorithm is used to find the shortest path in a weighted graph with no negative edges?",
    options:["Bellman-Ford","Dijkstra's Algorithm","DFS","BFS"],
    correctIndex:1
  },
  {
    id:"q21", kind:"code", topic:"DSA",
    prompt:"Write a function `twoSum(nums, target)` that returns the indices of the two numbers in the array that add up to `target`. Assume exactly one solution exists.",
    language:"javascript",
    starterCode:"function twoSum(nums, target) {\n  // your code here\n}",
    testCases:[
      {input:"[2,7,11,15], 9", expectedOutput:"[0,1]"},
      {input:"[3,2,4], 6", expectedOutput:"[1,2]"},
      {input:"[3,3], 6", expectedOutput:"[0,1]"}
    ],
    difficulty:2
  }
];

// ── C++ ───────────────────────────────────────────────────────────────────────
const cpp = [
  {
    id:"q1", kind:"mcq", topic:"Pointers",
    prompt:"What does the `*` operator do when used in a pointer declaration?",
    options:["Multiplies two numbers","Declares a pointer variable","Dereferences a pointer","Both A and C depending on context"],
    correctIndex:1
  },
  {
    id:"q2", kind:"mcq", topic:"Pointers",
    prompt:"What is a null pointer?",
    options:["A pointer that points to memory address 0","A pointer that holds garbage value","A pointer to an integer zero","A pointer that has been deleted"],
    correctIndex:0
  },
  {
    id:"q3", kind:"mcq", topic:"Memory Management",
    prompt:"Which operator is used to dynamically allocate memory in C++?",
    options:["malloc","alloc","new","create"],
    correctIndex:2
  },
  {
    id:"q4", kind:"mcq", topic:"Memory Management",
    prompt:"What is a memory leak in C++?",
    options:["Accessing memory out of bounds","Dynamically allocated memory that is never freed","Declaring too many variables","Stack overflow"],
    correctIndex:1
  },
  {
    id:"q5", kind:"mcq", topic:"STL",
    prompt:"Which STL container provides O(1) average time for insertion and lookup?",
    options:["std::vector","std::list","std::unordered_map","std::set"],
    correctIndex:2
  },
  {
    id:"q6", kind:"mcq", topic:"STL",
    prompt:"What does `std::vector::push_back()` do?",
    options:["Inserts an element at the beginning","Removes the last element","Adds an element to the end","Sorts the vector"],
    correctIndex:2
  },
  {
    id:"q7", kind:"mcq", topic:"OOP in C++",
    prompt:"What is a virtual function in C++?",
    options:["A function without a body","A function that can be overridden in derived classes to support runtime polymorphism","A private member function","A function in a template class"],
    correctIndex:1
  },
  {
    id:"q8", kind:"mcq", topic:"OOP in C++",
    prompt:"What is a copy constructor?",
    options:["A constructor that takes no arguments","A constructor that initializes an object using another object of the same class","A constructor that uses references","A static constructor"],
    correctIndex:1
  },
  {
    id:"q9", kind:"mcq", topic:"Templates",
    prompt:"What is the purpose of templates in C++?",
    options:["To provide GUI templates","To allow writing generic functions and classes that work with any data type","To define abstract classes","To manage memory automatically"],
    correctIndex:1
  },
  {
    id:"q10", kind:"mcq", topic:"OOP in C++",
    prompt:"Which keyword is used to prevent a class from being inherited in C++?",
    options:["static","const","final","sealed"],
    correctIndex:2
  },
  {
    id:"q11", kind:"mcq", topic:"Memory Management",
    prompt:"What does the destructor do in C++?",
    options:["Allocates memory","Initializes objects","Releases resources when an object goes out of scope","Copies an object"],
    correctIndex:2
  },
  {
    id:"q12", kind:"mcq", topic:"STL",
    prompt:"Which STL algorithm sorts a range in ascending order?",
    options:["std::find","std::sort","std::count","std::accumulate"],
    correctIndex:1
  },
  {
    id:"q13", kind:"mcq", topic:"Pointers",
    prompt:"What is the difference between a pointer and a reference in C++?",
    options:["There is no difference","A pointer can be null and reassigned; a reference cannot be null and must be initialized","References are faster","Pointers are for integers only"],
    correctIndex:1
  },
  {
    id:"q14", kind:"mcq", topic:"OOP in C++",
    prompt:"What is operator overloading in C++?",
    options:["Using too many operators","Defining custom behavior for operators when applied to user-defined types","Replacing arithmetic operations","Overriding logical operators only"],
    correctIndex:1
  },
  {
    id:"q15", kind:"mcq", topic:"Memory Management",
    prompt:"What is RAII in C++?",
    options:["Random Access Indexed Iteration","Resource Acquisition Is Initialization – ties resource lifetime to object lifetime","A garbage collection method","A type of smart pointer"],
    correctIndex:1
  },
  {
    id:"q16", kind:"mcq", topic:"STL",
    prompt:"What is the time complexity of `std::map` insertion?",
    options:["O(1)","O(n)","O(log n)","O(n log n)"],
    correctIndex:2
  },
  {
    id:"q17", kind:"mcq", topic:"Templates",
    prompt:"What is template specialization?",
    options:["Creating a template for GUI forms","Providing a specific implementation of a template for a particular data type","Using templates only for integers","Inheriting from a template class"],
    correctIndex:1
  },
  {
    id:"q18", kind:"mcq", topic:"OOP in C++",
    prompt:"What is a pure virtual function?",
    options:["A function without parameters","A virtual function with no implementation, making the class abstract","A private virtual function","A function called at compile time"],
    correctIndex:1
  },
  {
    id:"q19", kind:"mcq", topic:"Memory Management",
    prompt:"Which smart pointer in C++ ensures unique ownership of a resource?",
    options:["std::shared_ptr","std::weak_ptr","std::unique_ptr","std::auto_ptr"],
    correctIndex:2
  },
  {
    id:"q20", kind:"mcq", topic:"STL",
    prompt:"What does `std::stack` internally use by default?",
    options:["std::vector","std::list","std::deque","std::array"],
    correctIndex:2
  },
  {
    id:"q21", kind:"code", topic:"Algorithms",
    prompt:"Write a function `reverseString(s)` that takes a string and returns it reversed. Example: 'hello' → 'olleh'.",
    language:"javascript",
    starterCode:"function reverseString(s) {\n  // your code here\n}",
    testCases:[
      {input:"'hello'", expectedOutput:"\"olleh\""},
      {input:"'trafy'", expectedOutput:"\"yfart\""},
      {input:"'abcd'", expectedOutput:"\"dcba\""}
    ],
    difficulty:1
  }
];

// ── Java ──────────────────────────────────────────────────────────────────────
const java = [
  {
    id:"q1", kind:"mcq", topic:"JVM Architecture",
    prompt:"What is the JVM responsible for?",
    options:["Compiling Java source code to bytecode","Executing Java bytecode on any platform","Storing Java class definitions","Managing IDE plugins"],
    correctIndex:1
  },
  {
    id:"q2", kind:"mcq", topic:"JVM Architecture",
    prompt:"What is bytecode in Java?",
    options:["Native machine code","Intermediate compiled code that runs on the JVM","Source code with comments","Encrypted Java code"],
    correctIndex:1
  },
  {
    id:"q3", kind:"mcq", topic:"Collections Framework",
    prompt:"Which Java collection maintains insertion order and allows duplicates?",
    options:["HashSet","TreeSet","ArrayList","LinkedHashSet"],
    correctIndex:2
  },
  {
    id:"q4", kind:"mcq", topic:"Collections Framework",
    prompt:"What is the difference between HashMap and TreeMap in Java?",
    options:["HashMap is thread-safe, TreeMap is not","TreeMap maintains sorted key order; HashMap does not guarantee order","HashMap is slower","TreeMap allows null keys"],
    correctIndex:1
  },
  {
    id:"q5", kind:"mcq", topic:"Multithreading",
    prompt:"Which keyword in Java is used to prevent multiple threads from executing a block of code simultaneously?",
    options:["volatile","atomic","synchronized","static"],
    correctIndex:2
  },
  {
    id:"q6", kind:"mcq", topic:"Multithreading",
    prompt:"What is a race condition in Java multithreading?",
    options:["When two threads race in terms of CPU speed","When multiple threads access shared data concurrently, leading to inconsistent results","A compile-time error","A JVM crash"],
    correctIndex:1
  },
  {
    id:"q7", kind:"mcq", topic:"Exception Handling",
    prompt:"Which of the following is a checked exception in Java?",
    options:["NullPointerException","ArrayIndexOutOfBoundsException","IOException","ArithmeticException"],
    correctIndex:2
  },
  {
    id:"q8", kind:"mcq", topic:"Exception Handling",
    prompt:"What does the `finally` block do in Java?",
    options:["Executes only when an exception occurs","Executes only when no exception occurs","Always executes after try/catch regardless of whether an exception occurred","Catches all exceptions"],
    correctIndex:2
  },
  {
    id:"q9", kind:"mcq", topic:"OOP in Java",
    prompt:"What is the purpose of the `interface` keyword in Java?",
    options:["To define a class that cannot be instantiated","To define a contract that classes must implement","To create a singleton","To mark abstract methods only"],
    correctIndex:1
  },
  {
    id:"q10", kind:"mcq", topic:"OOP in Java",
    prompt:"What is method overloading in Java?",
    options:["Overriding a parent method","Defining multiple methods with the same name but different parameters in the same class","Using a method from an interface","Calling super class methods"],
    correctIndex:1
  },
  {
    id:"q11", kind:"mcq", topic:"JVM Architecture",
    prompt:"What does the Garbage Collector do in Java?",
    options:["Cleans up syntax errors","Automatically frees memory occupied by unreachable objects","Manages database connections","Optimizes CPU usage"],
    correctIndex:1
  },
  {
    id:"q12", kind:"mcq", topic:"Collections Framework",
    prompt:"Which interface does ArrayList implement?",
    options:["Map","Set","List","Queue"],
    correctIndex:2
  },
  {
    id:"q13", kind:"mcq", topic:"Multithreading",
    prompt:"What is a deadlock in Java multithreading?",
    options:["An infinite loop","A situation where two threads wait indefinitely for locks held by each other","A thread consuming too much CPU","A NullPointerException in a thread"],
    correctIndex:1
  },
  {
    id:"q14", kind:"mcq", topic:"OOP in Java",
    prompt:"What does the `abstract` keyword mean on a class?",
    options:["The class can only have static methods","The class cannot be instantiated and may have abstract methods","The class is immutable","The class extends Object directly"],
    correctIndex:1
  },
  {
    id:"q15", kind:"mcq", topic:"JVM Architecture",
    prompt:"What is the purpose of the `static` keyword in Java?",
    options:["Makes a method immutable","Declares a class-level variable or method shared across all instances","Makes a method private","Prevents inheritance"],
    correctIndex:1
  },
  {
    id:"q16", kind:"mcq", topic:"Exception Handling",
    prompt:"What happens if you catch `Exception` before `IOException` in a multi-catch?",
    options:["The code compiles and works normally","It will cause a compile-time error because the more specific exception is unreachable","Only IOException is caught","The JVM ignores both"],
    correctIndex:1
  },
  {
    id:"q17", kind:"mcq", topic:"Collections Framework",
    prompt:"Which Java collection is best for FIFO (First-In, First-Out) operations?",
    options:["Stack","LinkedList as Queue","TreeMap","PriorityQueue"],
    correctIndex:1
  },
  {
    id:"q18", kind:"mcq", topic:"OOP in Java",
    prompt:"What is the difference between `==` and `.equals()` in Java?",
    options:["They are identical","== checks reference equality; .equals() checks logical/value equality","== checks value; .equals() checks reference","Only primitives use =="],
    correctIndex:1
  },
  {
    id:"q19", kind:"mcq", topic:"Multithreading",
    prompt:"Which class in Java is used to create a thread by implementing an interface?",
    options:["Thread","Process","Runnable","Callable"],
    correctIndex:2
  },
  {
    id:"q20", kind:"mcq", topic:"JVM Architecture",
    prompt:"What is Just-In-Time (JIT) compilation?",
    options:["Compiling Java code at install time","Compiling bytecode to native machine code at runtime for performance","Pre-compiling Java to C++","Compiling code in a separate thread"],
    correctIndex:1
  },
  {
    id:"q21", kind:"code", topic:"Algorithms",
    prompt:"Write a function `isPalindrome(s)` that returns `true` if the string is a palindrome (reads the same forwards and backwards), and `false` otherwise. Ignore case.",
    language:"javascript",
    starterCode:"function isPalindrome(s) {\n  // your code here\n}",
    testCases:[
      {input:"'racecar'", expectedOutput:"true"},
      {input:"'hello'", expectedOutput:"false"},
      {input:"'Madam'", expectedOutput:"true"}
    ],
    difficulty:1
  }
];

// ── Python ────────────────────────────────────────────────────────────────────
const python = [
  {
    id:"q1", kind:"mcq", topic:"Core Python",
    prompt:"What is the output of: `print(type([]))`?",
    options:["<class 'tuple'>","<class 'dict'>","<class 'list'>","<class 'array'>"],
    correctIndex:2
  },
  {
    id:"q2", kind:"mcq", topic:"Core Python",
    prompt:"Which of the following is an immutable data type in Python?",
    options:["List","Dictionary","Set","Tuple"],
    correctIndex:3
  },
  {
    id:"q3", kind:"mcq", topic:"Decorators",
    prompt:"What is a decorator in Python?",
    options:["A design pattern for creating objects","A function that takes another function and extends its behavior without modifying it","A class decorator","A syntax for list comprehension"],
    correctIndex:1
  },
  {
    id:"q4", kind:"mcq", topic:"Generators",
    prompt:"What keyword is used to create a generator function in Python?",
    options:["return","async","yield","generate"],
    correctIndex:2
  },
  {
    id:"q5", kind:"mcq", topic:"Generators",
    prompt:"What is the main advantage of a generator over a list?",
    options:["Generators are faster for random access","Generators are memory-efficient as they produce values lazily","Generators support indexing","Generators are always sorted"],
    correctIndex:1
  },
  {
    id:"q6", kind:"mcq", topic:"List Comprehensions",
    prompt:"What does this expression produce: `[x**2 for x in range(5)]`?",
    options:["[1,4,9,16,25]","[0,1,4,9,16]","[0,1,2,3,4]","[1,2,3,4,5]"],
    correctIndex:1
  },
  {
    id:"q7", kind:"mcq", topic:"Memory Management",
    prompt:"How does Python manage memory?",
    options:["Manual memory management like C","Through garbage collection using reference counting","By reserving fixed memory blocks","Using JVM memory model"],
    correctIndex:1
  },
  {
    id:"q8", kind:"mcq", topic:"Data Structures",
    prompt:"What is the time complexity of looking up a key in a Python dictionary?",
    options:["O(n)","O(log n)","O(1) average","O(n²)"],
    correctIndex:2
  },
  {
    id:"q9", kind:"mcq", topic:"Core Python",
    prompt:"What does `*args` allow in a Python function?",
    options:["Pass keyword arguments","Pass a variable number of positional arguments","Unpack a dictionary","Multiply arguments"],
    correctIndex:1
  },
  {
    id:"q10", kind:"mcq", topic:"Core Python",
    prompt:"What is a lambda function in Python?",
    options:["A class method","An anonymous single-expression function","A recursive function","A decorator"],
    correctIndex:1
  },
  {
    id:"q11", kind:"mcq", topic:"OOP in Python",
    prompt:"What is `__init__` in Python?",
    options:["The destructor method","The constructor method that initializes a new object","A static method","A class variable"],
    correctIndex:1
  },
  {
    id:"q12", kind:"mcq", topic:"Core Python",
    prompt:"What is the difference between `is` and `==` in Python?",
    options:["They are the same","== checks identity; is checks equality","is checks identity (same object in memory); == checks value equality","is is only for numbers"],
    correctIndex:2
  },
  {
    id:"q13", kind:"mcq", topic:"Data Structures",
    prompt:"Which Python data structure is most appropriate for implementing a stack?",
    options:["dict","set","list (using append/pop)","tuple"],
    correctIndex:2
  },
  {
    id:"q14", kind:"mcq", topic:"Decorators",
    prompt:"What does `@staticmethod` do in Python?",
    options:["Makes a method a class method","Defines a method that doesn't receive the instance or class as first argument","Prevents overriding","Marks a method as private"],
    correctIndex:1
  },
  {
    id:"q15", kind:"mcq", topic:"Core Python",
    prompt:"What is the GIL in Python?",
    options:["Global Input Library","A thread lock that allows only one thread to execute Python bytecode at a time","A garbage collection mechanism","A type of decorator"],
    correctIndex:1
  },
  {
    id:"q16", kind:"mcq", topic:"Data Structures",
    prompt:"What does the `enumerate()` function do in Python?",
    options:["Converts a list to a dictionary","Returns (index, value) pairs when iterating","Sorts a list","Filters elements from a list"],
    correctIndex:1
  },
  {
    id:"q17", kind:"mcq", topic:"Core Python",
    prompt:"What does the `zip()` function do?",
    options:["Compresses a file","Combines two or more iterables into an iterator of tuples","Filters elements","Maps a function to elements"],
    correctIndex:1
  },
  {
    id:"q18", kind:"mcq", topic:"OOP in Python",
    prompt:"What is multiple inheritance in Python?",
    options:["Having multiple instances of a class","A class inheriting from more than one parent class","A class having multiple constructors","Overloading methods"],
    correctIndex:1
  },
  {
    id:"q19", kind:"mcq", topic:"Memory Management",
    prompt:"When does Python's garbage collector delete an object?",
    options:["When the program ends","When reference count drops to zero","After every function call","Every 60 seconds"],
    correctIndex:1
  },
  {
    id:"q20", kind:"mcq", topic:"Core Python",
    prompt:"What is a Python module?",
    options:["A class with methods","A file containing Python code that can be imported","A built-in function","A type of loop"],
    correctIndex:1
  },
  {
    id:"q21", kind:"code", topic:"Algorithms",
    prompt:"Write a function `fibonacci(n)` that returns the nth Fibonacci number. The sequence starts: 0, 1, 1, 2, 3, 5, 8...",
    language:"javascript",
    starterCode:"function fibonacci(n) {\n  // your code here\n}",
    testCases:[
      {input:"0", expectedOutput:"0"},
      {input:"5", expectedOutput:"5"},
      {input:"10", expectedOutput:"55"}
    ],
    difficulty:2
  }
];

// ── Web Dev ───────────────────────────────────────────────────────────────────
const webdev = [
  {
    id:"q1", kind:"mcq", topic:"HTML",
    prompt:"What is the purpose of the `<semantic>` elements like `<article>` and `<section>` in HTML5?",
    options:["To add styling","To improve SEO and accessibility by conveying meaning to browsers and screen readers","To create animations","To add JavaScript"],
    correctIndex:1
  },
  {
    id:"q2", kind:"mcq", topic:"CSS",
    prompt:"What is CSS specificity?",
    options:["The speed of CSS rendering","A ranking system that determines which CSS rule is applied when multiple rules target the same element","The number of CSS files","The order of CSS properties"],
    correctIndex:1
  },
  {
    id:"q3", kind:"mcq", topic:"CSS",
    prompt:"What does `display: flex` do?",
    options:["Makes an element visible","Enables the Flexbox layout model, making the element a flex container","Makes an element float","Hides an element"],
    correctIndex:1
  },
  {
    id:"q4", kind:"mcq", topic:"JavaScript",
    prompt:"What is the JavaScript Event Loop?",
    options:["A loop that iterates over events in an array","The mechanism that handles asynchronous operations by monitoring the call stack and task queue","A method to create event listeners","A for loop for DOM events"],
    correctIndex:1
  },
  {
    id:"q5", kind:"mcq", topic:"JavaScript",
    prompt:"What is a closure in JavaScript?",
    options:["Closing a browser window","A function that retains access to its outer (enclosing) scope even after the outer function has returned","A type of loop","An object method"],
    correctIndex:1
  },
  {
    id:"q6", kind:"mcq", topic:"JavaScript",
    prompt:"What does `Promise.all()` do?",
    options:["Resolves the first promise that settles","Waits for all promises to resolve and returns an array of results; rejects if any promise rejects","Runs promises sequentially","Cancels all pending promises"],
    correctIndex:1
  },
  {
    id:"q7", kind:"mcq", topic:"React",
    prompt:"What is the purpose of `useEffect` in React?",
    options:["To create state variables","To handle side effects such as data fetching, subscriptions, or DOM manipulation after render","To optimize renders","To create context"],
    correctIndex:1
  },
  {
    id:"q8", kind:"mcq", topic:"React",
    prompt:"What is the Virtual DOM in React?",
    options:["A copy of the server-side DOM","A lightweight in-memory representation of the real DOM that React uses to optimize updates","A 3D rendering engine","A CSS-in-JS solution"],
    correctIndex:1
  },
  {
    id:"q9", kind:"mcq", topic:"APIs",
    prompt:"What does REST stand for?",
    options:["Rapid Encoding State Transfer","Representational State Transfer","Remote Execution Service Technology","Resource Endpoint Standard Transfer"],
    correctIndex:1
  },
  {
    id:"q10", kind:"mcq", topic:"APIs",
    prompt:"Which HTTP method is idempotent and used to retrieve data?",
    options:["POST","DELETE","PUT","GET"],
    correctIndex:3
  },
  {
    id:"q11", kind:"mcq", topic:"JavaScript",
    prompt:"What is the difference between `let`, `const`, and `var`?",
    options:["They are identical","var is function-scoped; let and const are block-scoped; const cannot be reassigned","let is global; const is local","var cannot be reassigned"],
    correctIndex:1
  },
  {
    id:"q12", kind:"mcq", topic:"CSS",
    prompt:"What is the CSS Box Model?",
    options:["A 3D design pattern","A model describing how elements are rendered with content, padding, border, and margin","A CSS animation technique","A color management system"],
    correctIndex:1
  },
  {
    id:"q13", kind:"mcq", topic:"React",
    prompt:"What is `useState` in React?",
    options:["A lifecycle method","A hook that allows functional components to manage local state","A class-based state manager","A routing hook"],
    correctIndex:1
  },
  {
    id:"q14", kind:"mcq", topic:"JavaScript",
    prompt:"What does `async/await` do in JavaScript?",
    options:["Creates parallel threads","Provides syntactic sugar over Promises to write asynchronous code in a synchronous style","Makes code run faster","Prevents race conditions"],
    correctIndex:1
  },
  {
    id:"q15", kind:"mcq", topic:"HTML",
    prompt:"What is the purpose of the `meta viewport` tag in HTML?",
    options:["To define the page author","To control how the page is displayed on mobile devices (responsive design)","To set the page title","To include external scripts"],
    correctIndex:1
  },
  {
    id:"q16", kind:"mcq", topic:"APIs",
    prompt:"What is CORS?",
    options:["A CSS framework","A security feature that controls which origins can access resources from a different origin","A JavaScript module system","A database protocol"],
    correctIndex:1
  },
  {
    id:"q17", kind:"mcq", topic:"React",
    prompt:"What is prop drilling in React?",
    options:["A performance optimization","Passing props through multiple levels of components that don't need them just to reach a deeply nested component","A security issue","A React Native feature"],
    correctIndex:1
  },
  {
    id:"q18", kind:"mcq", topic:"JavaScript",
    prompt:"What does `JSON.stringify()` do?",
    options:["Parses a JSON string into a JavaScript object","Converts a JavaScript value to a JSON string","Validates JSON syntax","Formats JSON for display"],
    correctIndex:1
  },
  {
    id:"q19", kind:"mcq", topic:"CSS",
    prompt:"What is the difference between `position: absolute` and `position: relative`?",
    options:["They are the same","absolute is positioned relative to its nearest positioned ancestor; relative is offset from its normal position","absolute stays fixed on screen","relative is for animations only"],
    correctIndex:1
  },
  {
    id:"q20", kind:"mcq", topic:"React",
    prompt:"What is the purpose of `key` prop when rendering lists in React?",
    options:["It is used for styling","It helps React identify which items have changed, been added, or removed for efficient re-rendering","It sets the element's ID","It marks an element as interactive"],
    correctIndex:1
  },
  {
    id:"q21", kind:"code", topic:"JavaScript",
    prompt:"Write a function `fizzBuzz(n)` that returns an array of strings from 1 to n. For multiples of 3 use 'Fizz', for multiples of 5 use 'Buzz', for both use 'FizzBuzz', otherwise the number as a string.",
    language:"javascript",
    starterCode:"function fizzBuzz(n) {\n  // your code here\n}",
    testCases:[
      {input:"5", expectedOutput:'["1","2","Fizz","4","Buzz"]'},
      {input:"15", expectedOutput:'["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]'}
    ],
    difficulty:2
  }
];

// ── AI/ML ─────────────────────────────────────────────────────────────────────
const aiml = [
  {
    id:"q1", kind:"mcq", topic:"Machine Learning Basics",
    prompt:"What is supervised learning?",
    options:["Training a model without any data","Learning where the model is trained on labeled input-output pairs","Learning where the algorithm explores on its own","Training using only images"],
    correctIndex:1
  },
  {
    id:"q2", kind:"mcq", topic:"Machine Learning Basics",
    prompt:"What is overfitting in a machine learning model?",
    options:["The model performs poorly on training data","The model learns the training data too well, including noise, and performs poorly on new data","The model is too simple","Having too many features"],
    correctIndex:1
  },
  {
    id:"q3", kind:"mcq", topic:"Neural Networks",
    prompt:"What is an activation function in a neural network?",
    options:["A function that initializes weights","A function applied to neuron outputs to introduce non-linearity","A loss function","A regularization technique"],
    correctIndex:1
  },
  {
    id:"q4", kind:"mcq", topic:"Neural Networks",
    prompt:"What is backpropagation?",
    options:["Running the neural network forward","The algorithm for computing gradients to update weights by propagating error backward through the network","Preprocessing training data","Evaluating model accuracy"],
    correctIndex:1
  },
  {
    id:"q5", kind:"mcq", topic:"Gradient Descent",
    prompt:"What does the learning rate control in gradient descent?",
    options:["The number of training samples","The step size taken when updating model weights during training","The number of layers in a network","The activation function used"],
    correctIndex:1
  },
  {
    id:"q6", kind:"mcq", topic:"Gradient Descent",
    prompt:"What is the problem with a learning rate that is too high?",
    options:["Training becomes too slow","The model may overshoot the optimal solution and fail to converge","The model always underfits","It has no effect on training"],
    correctIndex:1
  },
  {
    id:"q7", kind:"mcq", topic:"NLP Basics",
    prompt:"What is tokenization in NLP?",
    options:["Converting numbers to text","The process of splitting text into smaller units like words or subwords","Translating text to another language","Classifying text into categories"],
    correctIndex:1
  },
  {
    id:"q8", kind:"mcq", topic:"NLP Basics",
    prompt:"What does TF-IDF measure?",
    options:["Translation frequency","The importance of a word in a document relative to a collection of documents","The length of a sentence","Grammar correctness"],
    correctIndex:1
  },
  {
    id:"q9", kind:"mcq", topic:"Computer Vision",
    prompt:"What is a Convolutional Neural Network (CNN) primarily used for?",
    options:["Time series prediction","Processing grid-like data such as images by learning spatial features","Natural language understanding","Reinforcement learning"],
    correctIndex:1
  },
  {
    id:"q10", kind:"mcq", topic:"Machine Learning Basics",
    prompt:"What is the purpose of a validation set?",
    options:["To train the model","To tune hyperparameters and evaluate model performance during training without touching the test set","To augment training data","To store model weights"],
    correctIndex:1
  },
  {
    id:"q11", kind:"mcq", topic:"Machine Learning Basics",
    prompt:"What is regularization used for?",
    options:["Speeding up training","Reducing overfitting by adding a penalty to large model weights","Normalizing input data","Increasing model complexity"],
    correctIndex:1
  },
  {
    id:"q12", kind:"mcq", topic:"Neural Networks",
    prompt:"What is a dropout layer used for in neural networks?",
    options:["Removing neurons permanently","Randomly deactivating neurons during training to reduce overfitting","Adding more neurons","Normalizing layer outputs"],
    correctIndex:1
  },
  {
    id:"q13", kind:"mcq", topic:"Gradient Descent",
    prompt:"What is the difference between batch gradient descent and stochastic gradient descent?",
    options:["There is no difference","Batch uses all training data per update; SGD uses one sample per update","SGD is slower","Batch gradient descent doesn't use gradients"],
    correctIndex:1
  },
  {
    id:"q14", kind:"mcq", topic:"Machine Learning Basics",
    prompt:"What does the confusion matrix measure?",
    options:["Model training speed","The performance of a classification model showing true/false positives and negatives","Feature importance","Training data size"],
    correctIndex:1
  },
  {
    id:"q15", kind:"mcq", topic:"NLP Basics",
    prompt:"What is word embedding?",
    options:["Hiding words in code","Representing words as dense real-valued vectors in a continuous vector space where similar words have similar vectors","Tokenizing sentences","Counting word frequency"],
    correctIndex:1
  },
  {
    id:"q16", kind:"mcq", topic:"Machine Learning Basics",
    prompt:"What is the difference between classification and regression?",
    options:["There is no difference","Classification predicts discrete class labels; regression predicts continuous numerical values","Regression is for images","Classification uses neural networks only"],
    correctIndex:1
  },
  {
    id:"q17", kind:"mcq", topic:"Computer Vision",
    prompt:"What is transfer learning in computer vision?",
    options:["Copying data between computers","Using a model pre-trained on a large dataset as a starting point for a new task","Training from scratch","Moving model weights to GPU"],
    correctIndex:1
  },
  {
    id:"q18", kind:"mcq", topic:"Neural Networks",
    prompt:"What is the ReLU activation function?",
    options:["f(x) = 1/(1+e^(-x))","f(x) = max(0, x)","f(x) = tanh(x)","f(x) = x²"],
    correctIndex:1
  },
  {
    id:"q19", kind:"mcq", topic:"Machine Learning Basics",
    prompt:"What is cross-validation?",
    options:["Comparing two different models","A technique to assess model generalization by training and evaluating on different subsets of the data","A data preprocessing step","A type of regularization"],
    correctIndex:1
  },
  {
    id:"q20", kind:"mcq", topic:"NLP Basics",
    prompt:"What is a transformer model in NLP?",
    options:["An electrical component","A neural network architecture using self-attention mechanisms, powering models like BERT and GPT","A type of RNN","A tokenization method"],
    correctIndex:1
  },
  {
    id:"q21", kind:"code", topic:"Mathematics for AI",
    prompt:"Write a function `meanSquaredError(yTrue, yPred)` that calculates the Mean Squared Error between two arrays of numbers. MSE = average of (yTrue[i] - yPred[i])^2.",
    language:"javascript",
    starterCode:"function meanSquaredError(yTrue, yPred) {\n  // your code here\n}",
    testCases:[
      {input:"[1,2,3], [1,2,3]", expectedOutput:"0"},
      {input:"[1,2,3], [2,3,4]", expectedOutput:"1"},
      {input:"[0,0], [1,1]", expectedOutput:"1"}
    ],
    difficulty:2
  }
];

const tracks = {
  "core-cs": coreCS,
  "cpp": cpp,
  "java": java,
  "python": python,
  "webdev": webdev,
  "aiml": aiml
};

export const allQuestions = [...coreCS, ...cpp, ...java, ...python, ...webdev, ...aiml].filter(q => q.kind === 'mcq');
