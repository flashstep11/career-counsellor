import React from "react";

export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

            <div className="prose max-w-none">
                <p className="mb-4">Last updated: March 20, 2025</p>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                    <p>
                        AlumNiti ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">The Data We Collect About You</h2>
                    <p>
                        Personal data means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                    </p>
                    <ul className="list-disc pl-5 mt-3 space-y-2">
                        <li>Identity Data includes first name, last name, username or similar identifier.</li>
                        <li>Contact Data includes email address and telephone numbers.</li>
                        <li>Technical Data includes internet protocol (IP) address, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform.</li>
                        <li>Profile Data includes your username and password, your interests, preferences, feedback and survey responses.</li>
                        <li>Usage Data includes information about how you use our website, products and services.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">How We Use Your Personal Data</h2>
                    <p>
                        We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                    </p>
                    <ul className="list-disc pl-5 mt-3 space-y-2">
                        <li>To register you as a new customer.</li>
                        <li>To provide personalized career guidance and recommendations.</li>
                        <li>To manage our relationship with you.</li>
                        <li>To improve our website, products/services, marketing, and customer relationships.</li>
                        <li>To administer and protect our business and this website.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
                    <p>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. We limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Your Legal Rights</h2>
                    <p>
                        Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, object to processing, and data portability.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                    <p>
                        If you have any questions about this privacy policy or our privacy practices, please feel free to contact us.
                    </p>
                </section>
            </div>
        </div>
    );
}
