import nodemailer from 'nodemailer';

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: 'theboyykanpur@gmail.com', 
        pass: 'zgvemevlsmxevntm', 
    },
});

export default transporter;
