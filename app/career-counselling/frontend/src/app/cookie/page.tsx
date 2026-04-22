import React from "react";

export default function CookiePolicy() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>

            <div className="prose max-w-none">
                <p className="mb-4">Last updated: March 20, 2025</p>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">What Are Cookies</h2>
                    <p>
                        Cookies are small pieces of text sent by your web browser by a website you visit. A cookie file is stored in your web browser and allows the service or a third-party to recognize you and make your next visit easier and more useful to you.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">How We Use Cookies</h2>
                    <p>
                        AlumNiti uses cookies for several reasons. We use cookies to understand and save user preferences for future visits, to compile aggregate data about site traffic and site interaction, and to assist in our marketing efforts. Specifically, we use cookies for:
                    </p>
                    <ul className="list-disc pl-5 mt-3 space-y-2">
                        <li>
                            <strong>Essential cookies:</strong> These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access.
                        </li>
                        <li>
                            <strong>Preference cookies:</strong> These cookies enable a website to remember information that changes the way the website behaves or looks, like your preferred language or region.
                        </li>
                        <li>
                            <strong>Statistics cookies:</strong> These cookies help us to understand how visitors interact with our website by collecting and reporting information anonymously.
                        </li>
                        <li>
                            <strong>Marketing cookies:</strong> These cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging for the individual user.
                        </li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Third-Party Cookies</h2>
                    <p>
                        In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the service, deliver advertisements on and through the service, and so on. These may include:
                    </p>
                    <ul className="list-disc pl-5 mt-3 space-y-2">
                        <li>Google Analytics for tracking website usage and user behavior</li>
                        <li>Facebook Pixel for advertising measurement and optimization</li>
                        <li>LinkedIn Insight Tag for campaign reporting and insights</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">What Are Your Choices Regarding Cookies</h2>
                    <p>
                        If you'd prefer to restrict, block or delete cookies from AlumNiti, you can use your browser to do this. Each browser is different, so check the 'Help' menu of your particular browser to learn how to change your cookie preferences.
                    </p>
                    <p className="mt-2">
                        Please be aware that restricting cookies may impact the functionality of our website. For example, you may not be able to use all the interactive features of our site.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">More Information</h2>
                    <p>
                        If you have any questions about our use of cookies, please feel free to contact us.
                    </p>
                </section>
            </div>
        </div>
    );
}
