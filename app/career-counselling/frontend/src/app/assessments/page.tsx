"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout, BrainCircuit, ArrowRight, CheckCircle } from "lucide-react";

export default function AssessmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="mb-16 text-center mt-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600 mb-6">
            Career Assessments
          </h1>
          <p className="text-lg text-gray-600 max-w-[700px] mx-auto leading-relaxed">
            Discover your strengths, interests, and potential career paths with our scientifically validated assessment tools.
            These assessments will help you make informed decisions about your educational and professional journey.
          </p>
        </div>
        
        {/* Enhanced Grid with Consistent Height Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* RIASEC Assessment Card - Enhanced Active State */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-200 bg-white flex flex-col h-full">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-2xl font-bold text-blue-800">RIASEC Assessment</CardTitle>
                <Badge className="bg-green-100 text-green-700 border-0 rounded-full px-3 py-1">Available</Badge>
              </div>
              <CardDescription className="text-base">Holland Code Personality Test</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-gray-600 leading-relaxed mb-6">
                The RIASEC test helps identify your interests and how they relate to different careers.
                It measures six personality types: Realistic, Investigative, Artistic, Social, Enterprising, and Conventional.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-gray-700 font-medium">Time: 5-7 minutes</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-gray-700 font-medium">Questions: 30</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-gray-700 font-medium">Get instant results</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/assessments/riasec" className="w-full">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-md">
                  Take Assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
          
          {/* Coming Soon Assessment Cards - Enhanced Placeholder Style */}
          {['Multiple Intelligence', 'Big Five Personality', 'Career Values'].map((test, index) => (
            <Card key={index} className="shadow-md border border-gray-200 bg-white opacity-60 grayscale-[40%] flex flex-col h-full">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-2xl font-bold text-gray-600">{test}</CardTitle>
                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 rounded-full px-3 py-1">Coming Soon</Badge>
                </div>
                <CardDescription className="text-base">Personality Assessment</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-gray-500 leading-relaxed mb-6">
                  This assessment will help you understand your personality traits, strengths, and potential career paths
                  that match your unique profile.
                </p>
                
                <div className="space-y-3 text-gray-400">
                  <div className="flex items-center gap-3">
                    <Layout className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">Multiple dimensions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <BrainCircuit className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">Comprehensive insights</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button disabled variant="outline" className="w-full bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200">
                  Coming Soon
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* Bottom Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-blue-800 mb-4">More Assessments Coming Soon</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
            We're constantly working on new assessments to help you discover more about yourself and your career potential.
            Check back soon for updates!
          </p>
        </div>
      </div>
    </div>
  );
}