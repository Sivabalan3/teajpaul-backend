const User = require("../../Models/userModel/UserModel");

// Login Controller
const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate the request body
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    // If user is not found
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare passwords (as the password is stored in plain text in this example)
    const isMatch = user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // If login is successful, send a success response
    return res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

// Register Controller
const register = async (req, res) => {
  const { username, email, password } = req.body;

  // Validate the request body
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Create a new user
    const newUser = new User({
      username,
      email,
      password, // Password is stored as plain text here (consider using hashing)
    });

    // Save the user to the database
    await newUser.save();

    // Return success response
    return res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { login, register };
