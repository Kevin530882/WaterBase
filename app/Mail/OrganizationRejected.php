<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrganizationRejected extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public ?string $notes;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, ?string $notes = null)
    {
        $this->user = $user;
        $this->notes = $notes;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Your organization account has been rejected')
            ->view('emails.organization_rejected')
            ->with([
                'user' => $this->user,
                'notes' => $this->notes,
            ]);
    }
}
