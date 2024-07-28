import nodemailer from 'nodemailer';

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: 'example@example.com', 
        pass: 'examplepassword', 
    },
});

export default transporter;
