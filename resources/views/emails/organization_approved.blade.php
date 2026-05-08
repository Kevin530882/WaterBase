<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Organization Account Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c5282;">Welcome to WaterBase!</h2>

        <p>Hello {{ $user->firstName }} {{ $user->lastName }},</p>

        <p>Your organization account for <strong>{{ $user->organization }}</strong> has been <strong>approved</strong>.</p>

        <p>You can now log in and use all features available to your account.</p>

        <p style="margin-top: 24px;">If you have any questions, feel free to reach out to our support team.</p>

        <p style="margin-top: 24px;">Best regards,<br>The WaterBase Team</p>
    </div>
</body>
</html>
