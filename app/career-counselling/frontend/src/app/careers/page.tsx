'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Job listing type
type JobListing = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
};

// Sample job listings data
const jobListings: JobListing[] = [
  {
    id: 'career-counselor-1',
    title: 'Career Counselor',
    department: 'Counseling',
    location: 'Remote',
    type: 'Full-time',
    description: 'Guide students in making informed career decisions through one-on-one counseling sessions.',
    responsibilities: [
      'Conduct individual counseling sessions',
      'Administer and interpret career assessment tools',
      'Develop personalized career plans for students',
      'Stay updated on industry trends and educational pathways',
    ],
    requirements: [
      'Master\'s degree in Counseling, Psychology, or related field',
      'Minimum 3 years of experience in career counseling',
      'Knowledge of career development theories and assessment tools',
      'Strong communication and empathy skills',
    ],
  },
  {
    id: 'content-writer-1',
    title: 'Content Writer',
    department: 'Content',
    location: 'Hybrid',
    type: 'Full-time',
    description: 'Create engaging and informative content about career paths, industries, and professional development.',
    responsibilities: [
      'Research and write articles on career-related topics',
      'Create guides for different career paths',
      'Develop content for website and social media',
      'Interview industry experts for insights',
    ],
    requirements: [
      'Bachelor\'s degree in English, Communications, or related field',
      'Strong writing and research skills',
      'Knowledge of SEO principles',
      'Portfolio of published work',
    ],
  },
  {
    id: 'software-developer-1',
    title: 'Software Developer',
    department: 'Engineering',
    location: 'On-site',
    type: 'Full-time',
    description: 'Join our engineering team to build and maintain our career counseling platform.',
    responsibilities: [
      'Develop new features for our web application',
      'Maintain existing codebase and fix bugs',
      'Collaborate with design and product teams',
      'Write clean, efficient, and maintainable code',
    ],
    requirements: [
      'Bachelor\'s degree in Computer Science or related field',
      'Proficiency in React, TypeScript, and Node.js',
      'Experience with database technologies',
      'Strong problem-solving skills',
    ],
  },
];

export default function CareersPage() {
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [activeTab, setActiveTab] = useState('openings');
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        {/* Hero section */}
        <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Join Our Mission</h1>
            <p className="text-xl max-w-2xl mx-auto">
              Help us guide the next generation towards fulfilling careers and make a lasting impact on students' lives.
            </p>
            <Button 
              variant="secondary" 
              size="lg" 
              className="mt-8"
              onClick={() => setActiveTab('openings')}
            >
              View Open Positions
            </Button>
          </div>
        </section>

        {/* Main content */}
        <section className="container mx-auto px-4 py-16">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="openings">Open Positions</TabsTrigger>
              <TabsTrigger value="culture">Our Culture</TabsTrigger>
              <TabsTrigger value="apply">How to Apply</TabsTrigger>
            </TabsList>

            {/* Job Openings Tab */}
            <TabsContent value="openings" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`space-y-6 ${selectedJob ? 'hidden md:block' : ''}`}>
                  <h2 className="text-2xl font-bold">Current Openings</h2>
                  {jobListings.map((job) => (
                    <Card 
                      key={job.id} 
                      className={`cursor-pointer transition-all hover:border-blue-500 ${selectedJob?.id === job.id ? 'border-blue-500 border-2' : ''}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{job.title}</CardTitle>
                            <CardDescription>{job.department}</CardDescription>
                          </div>
                          <Badge variant="outline">{job.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">{job.description}</p>
                      </CardContent>
                      <CardFooter>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{job.location}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                <div className={`${!selectedJob && 'hidden md:block'}`}>
                  {selectedJob ? (
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mb-2 p-0 md:hidden"
                              onClick={() => setSelectedJob(null)}
                            >
                              ← Back to listings
                            </Button>
                            <CardTitle>{selectedJob.title}</CardTitle>
                            <CardDescription>{selectedJob.department} • {selectedJob.location}</CardDescription>
                          </div>
                          <Badge variant="outline">{selectedJob.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-2">Job Description</h3>
                          <p>{selectedJob.description}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Responsibilities</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {selectedJob.responsibilities.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Requirements</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {selectedJob.requirements.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" onClick={() => setActiveTab('apply')}>
                          Apply for this Position
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-8">
                        <h3 className="text-xl font-medium mb-2">Select a Job</h3>
                        <p className="text-gray-500">
                          Click on any job listing to see more details
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Culture Tab */}
            <TabsContent value="culture">
              <div className="space-y-10">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Our Culture & Values</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Student-Centric</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>We put students first in everything we do. Their success is our primary metric and the driving force behind our work.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Continuous Learning</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>We embrace growth and development, both for our team members and for our platform. We're always learning and evolving.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Diversity & Inclusion</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>We celebrate different perspectives and backgrounds, creating an environment where everyone feels welcome and valued.</p>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">Benefits & Perks</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex gap-3">
                      <div className="bg-blue-100 p-2 rounded-full h-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Competitive Compensation</h3>
                        <p className="text-gray-600">We offer salaries that reflect your experience and the value you bring to our team.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="bg-blue-100 p-2 rounded-full h-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Flexible Work Options</h3>
                        <p className="text-gray-600">Remote work opportunities and flexible hours to help you maintain work-life balance.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="bg-blue-100 p-2 rounded-full h-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Professional Development</h3>
                        <p className="text-gray-600">Budget for courses, conferences, and resources to support your career growth.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="bg-blue-100 p-2 rounded-full h-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Comprehensive Benefits</h3>
                        <p className="text-gray-600">Health insurance, retirement plans, and other benefits to support your wellbeing.</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </TabsContent>

            {/* Apply Tab */}
            <TabsContent value="apply">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-2xl font-bold mb-4">How to Apply</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">1. Submit Your Application</h3>
                      <p className="text-gray-600">
                        Fill out the application form with your contact information and details about the position you're interested in.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">2. Initial Review</h3>
                      <p className="text-gray-600">
                        Our team will review your application and reach out if your qualifications match our needs.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">3. Interview Process</h3>
                      <p className="text-gray-600">
                        Typically includes an initial phone screen, followed by technical or skills assessments, and a final interview with the team.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">4. Decision & Onboarding</h3>
                      <p className="text-gray-600">
                        We aim to make decisions quickly. Once an offer is extended and accepted, we'll guide you through our thorough onboarding process.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">Application Form</h2>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="first-name" className="text-sm font-medium">First Name</label>
                        <Input id="first-name" placeholder="Enter your first name" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="last-name" className="text-sm font-medium">Last Name</label>
                        <Input id="last-name" placeholder="Enter your last name" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <Input id="email" type="email" placeholder="Enter your email address" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                      <Input id="phone" placeholder="Enter your phone number" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="position" className="text-sm font-medium">Position</label>
                      <select 
                        id="position" 
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        defaultValue={selectedJob?.title || ""}
                      >
                        <option value="" disabled>Select a position</option>
                        {jobListings.map(job => (
                          <option key={job.id} value={job.title}>{job.title}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="resume" className="text-sm font-medium">Resume/CV</label>
                      <Input id="resume" type="file" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="cover-letter" className="text-sm font-medium">Cover Letter (Optional)</label>
                      <Textarea id="cover-letter" placeholder="Tell us why you're interested in this position" rows={4} />
                    </div>
                    
                    <Button type="submit" className="w-full">Submit Application</Button>
                  </form>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
