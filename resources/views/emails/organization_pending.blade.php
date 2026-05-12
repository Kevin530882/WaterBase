<html>
<body>
    <p>Hi {{ trim(($user->firstName ?? '') . ' ' . ($user->lastName ?? '')) }},</p>

    <p>Thank you for registering your WaterBase account@if($user->organization) for {{ $user->organization }}@endif. Your registration is currently pending admin review.</p>

    <p>We will send you another email once your account has been reviewed and approved. In the meantime, please wait for the confirmation.</p>

    <p>— The WaterBase Team</p>
</body>
</html>
