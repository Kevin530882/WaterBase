import Navigation from '@/components/Navigation';

export const Terms = () => {
    return (
        <div className="min-h-screen bg-waterbase-50">
            <Navigation />
            <div className="max-w-4xl mx-auto py-16 px-6">
                <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
                <p className="mb-4 text-waterbase-600">This is a placeholder Terms of Service page used for registration links and testing. Replace with the project's official terms.</p>
                <section className="prose prose-invert">
                    <h2>Acceptable Use</h2>
                    <p>By using WaterBase you agree to the rules and guidelines outlined here.</p>
                    <h2>Content</h2>
                    <p>Users are responsible for the content they submit. Do not upload illegal materials.</p>
                    <h2>Privacy</h2>
                    <p>See our Privacy Policy for information about how we handle your data.</p>
                </section>
            </div>
        </div>
    );
};

export default Terms;
