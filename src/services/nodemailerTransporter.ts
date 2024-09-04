import nodemailer from 'nodemailer';

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: process.env.EMAIL, 
        pass: process.env.EMAIL_PASSWORD, 
    },
});

export default transporter;
