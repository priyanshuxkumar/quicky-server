import transporter from "./nodemailerTransporter"

export const sendOTPEmail = async(email:string , otp:string) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email, 
            subject: 'Verify your email for Quicky', 
            text: `Your OTP for verification is: ${otp}`,
            html: `<p>Your OTP for verification is: <b>${otp}</b></p>`, 
        });

        console.log('OTP email sent successfully.');
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email.');
    }
}   