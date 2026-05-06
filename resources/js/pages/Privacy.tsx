import Navigation from '@/components/Navigation';

export const Privacy = () => {
    return (
        <div className="min-h-screen bg-waterbase-50">
            <Navigation />
            <div className="max-w-4xl mx-auto py-16 px-6">
                <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
                <p className="mb-4 text-waterbase-600">This is a placeholder Privacy Policy page. Replace with the official privacy policy content.</p>
                <section className="prose prose-invert">
                    <h2>Data Collected</h2>
                    <p>We collect basic account information and content you submit for reporting.</p>
                    <h2>Use of Data</h2>
                    <p>Data is used to provide service features and communicate important notifications.</p>
                </section>
            </div>
        </div>
    );
};

export default Privacy;
