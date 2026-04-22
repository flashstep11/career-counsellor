import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">About AlumNiti</h1>
                    <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
                        Empowering individuals to discover their perfect career path through personalized guidance and expertise.
                    </p>
                </div>
            </div>

            {/* Mission Section */}
            <div className="mt-16 max-w-7xl mx-auto">
                <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Our Mission</h2>
                        <p className="mt-3 text-lg text-gray-500">
                            At AlumNiti, we believe everyone deserves a fulfilling career that aligns with their strengths, passions, and values. Our mission is to bridge the gap between education and employment by providing personalized career counseling services that guide individuals toward making informed career decisions.
                        </p>
                        <p className="mt-3 text-lg text-gray-500">
                            We combine advanced technology with human expertise to deliver customized career roadmaps that consider your unique skills, interests, and market demands.
                        </p>
                    </div>
                    <div className="mt-12 lg:mt-0">
                        <div className="bg-gray-100 rounded-lg overflow-hidden h-64 flex items-center justify-center relative">
                            <Image
                                src="https://media.licdn.com/dms/image/v2/D4D12AQFkeHjPFejhzg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1689058898217?e=2147483647&v=beta&t=aDyfRAgj-opLlpQ6TBAFjT44Ae0NNP8xkEENWJAbYks"
                                alt="AlumNiti mission"
                                fill
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Values Section */}
            <div className="mt-16 max-w-7xl mx-auto">
                <h2 className="text-3xl font-extrabold text-center text-gray-900 sm:text-4xl">Our Values</h2>
                <div className="mt-10 grid gap-10 lg:grid-cols-3">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900">Personalization</h3>
                            <p className="mt-2 text-base text-gray-500">
                                We recognize that each person's career journey is unique. Our counseling services are tailored to individual needs, goals, and circumstances.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900">Expertise</h3>
                            <p className="mt-2 text-base text-gray-500">
                                Our team comprises certified career counselors, industry experts, and technology specialists who bring depth and breadth of knowledge to our services.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900">Innovation</h3>
                            <p className="mt-2 text-base text-gray-500">
                                We leverage the latest technologies and research to provide cutting-edge career guidance solutions that evolve with the changing job market.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Section */}
            <div className="mt-16 max-w-7xl mx-auto">
                <h2 className="text-3xl font-extrabold text-center text-gray-900 sm:text-4xl">Our Team</h2>
                <p className="mt-4 max-w-3xl mx-auto text-center text-lg text-gray-500">
                    Our diverse team of career counselors, developers, and industry experts work together to provide you with the best guidance possible.
                </p>
                <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-5">
                    {["Arihant Tripathy", "Jayanth Raju Saraswati", "Mohit Kumar Singh", "Prabhav", "Saksham Chitkara"].map((name) => (
                        <div key={name} className="text-center">
                            <div className="mt-4">
                                <h3 className="text-lg font-medium text-gray-900">{name}</h3>
                                <p className="text-sm text-gray-500">Team Member</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="mt-16 max-w-7xl mx-auto text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                    Ready to start your career journey?
                </h2>
                <div className="mt-8 flex justify-center">
                    <div className="inline-flex rounded-md shadow">
                        <Link href="/register"
                            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
