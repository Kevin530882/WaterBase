<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Account Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c53030;">Account Registration Rejected</h2>

        <p>Hello {{ $user->firstName }} {{ $user->lastName }},</p>

        <p>We regret to inform you that your WaterBase account@if($user->organization) for <strong>{{ $user->organization }}</strong>@endif has been <strong>rejected</strong>.</p>

        @if($notes)
            <p><strong>Reason:</strong></p>
            <p style="background: #f7fafc; padding: 12px; border-left: 4px solid #c53030;">{{ $notes }}</p>
        @endif

        <p>If you believe this was a mistake or have additional documentation, please contact our support team.</p>

        <p style="margin-top: 24px;">Best regards,<br>The WaterBase Team</p>
    </div>
</body>
</html>
