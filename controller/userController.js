const User = require("../models/User"); // Make sure to import your User model

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const loginResult = await User.matchPassword(email, password);

        if (loginResult === false) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        // Set cookie and send response
        res.cookie("token", loginResult, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        }).json({
            success: true,
            token: loginResult,
            message: "Login successful",
            role: user.role,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during login"
        });
    }
}

async function signin(req, res) {
    try {
        const { name, email, password,amount,riskAppetite } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        // Check if user already exists
        const existingUser = await User.find({ email });
        if (existingUser.length !== 0) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email",
                user: {
                    name: existingUser.name,
                    email: existingUser.email,
                }
            });
        }

        // Create new user
        const newUser = new User({
            name,
            email,
            password,
            riskAppetite,
            amount,
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: "Signup successful",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                address: newUser.address,
                city: newUser.city,
                pincode: newUser.pincode,
                phoneNumber: newUser.phoneNumber
            }
        });

    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during signup",
            error: error.message
        });
    }
}

module.exports = { login, signin };