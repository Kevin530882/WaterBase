import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, X, QrCode, AlertCircle } from "lucide-react";

interface QRCodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: number | null;
    eventTitle?: string;
    currentVolunteers?: number;
}

export const QRCodeDialog = ({
    open,
    onOpenChange,
    eventId,
    eventTitle = "Cleanup Event",
    currentVolunteers = 0,
}: QRCodeDialogProps) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [error, setError] = useState<string>("");

    useEffect(() => {
        if (!open || !eventId) return;

        let cancelled = false;
        setError("");

        const generateQR = async () => {
            try {
                console.log("Generating QR code for event:", eventId);
                const QRCode = await import("qrcode");
                const dataUrl = await QRCode.toDataURL(
                    `waterbase://event/${eventId}/attend`,
                    {
                        width: 300,
                        margin: 2,
                        color: {
                            dark: "#0369a1",
                            light: "#ffffff",
                        },
                    }
                );
                if (!cancelled) {
                    console.log("QR code generated successfully");
                    setQrDataUrl(dataUrl);
                }
            } catch (err) {
                console.error("Failed to generate QR code:", err);
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to generate QR code");
                }
            }
        };

        generateQR();

        return () => {
            cancelled = true;
        };
    }, [open, eventId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5" />
                        Event QR Code
                    </DialogTitle>
                    <DialogDescription>
                        Volunteers can scan this code to check in for "{eventTitle}"
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center space-y-4 py-4">
                    {error ? (
                        <div className="w-64 h-64 bg-red-50 rounded-xl flex flex-col items-center justify-center border-2 border-red-200 p-4">
                            <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
                            <span className="text-red-600 text-center text-sm font-medium">{error}</span>
                            <Button 
                                onClick={() => setError("")}
                                className="mt-4 text-xs"
                                variant="outline"
                            >
                                Try Again
                            </Button>
                        </div>
                    ) : qrDataUrl ? (
                        <div className="bg-white p-4 rounded-xl border-2 border-waterbase-200 shadow-sm">
                            <img
                                src={qrDataUrl}
                                alt="Event QR Code"
                                className="w-64 h-64"
                            />
                        </div>
                    ) : (
                        <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                            <span className="text-gray-500">Generating QR code...</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-waterbase-700 bg-waterbase-50 px-4 py-2 rounded-lg">
                        <Users className="w-4 h-4" />
                        <span>
                            {currentVolunteers} volunteer{currentVolunteers !== 1 ? "s" : ""} checked in
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 text-center max-w-xs">
                        Ask volunteers to open the WaterBase app and scan this QR code
                        to mark their attendance.
                    </p>
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
