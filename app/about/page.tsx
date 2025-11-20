"use client"

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Briefcase, Zap, Target, Users, Award } from 'lucide-react'

// You can replace this with a real image of Tim Behrens
const TIM_IMAGE_URL = "/tim-behrens.jpg" 

const AboutPage = () => {
  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center text-center px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black z-10" />
        <Image
          src="/tluca-hero-background.jpg" // Replace with a suitable background
          alt="Abstract background"
          layout="fill"
          objectFit="cover"
          className="opacity-20"
        />
        <div className="relative z-20 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Driving Growth for Service-Based Businesses
          </h1>
          <p className="text-lg sm:text-xl text-gray-300">
            We are TLUCA Systems—a dedicated team of strategists, designers, and developers passionate about building high-performance digital solutions that deliver real results.
          </p>
        </div>
      </section>

      {/* Meet the Founder Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <div className="md:col-span-1 flex justify-center">
              <div className="relative w-64 h-64">
                <Avatar className="w-full h-full border-4 border-white/20 shadow-lg">
                  <AvatarImage src={TIM_IMAGE_URL} alt="Tim Behrens" />
                  <AvatarFallback className="text-4xl bg-gray-800">TB</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-3xl font-bold mb-4">Meet Our Founder</h2>
              <h3 className="text-2xl text-gray-300 mb-6">Tim Behrens</h3>
              <div className="space-y-4 text-gray-400">
                <p>
                  With a deep-rooted passion for technology and a keen eye for business strategy, Tim Behrens founded TLUCA Systems to bridge the gap between powerful digital tools and the service industries that need them most.
                </p>
                <p>
                  Tim believes that every service business, from local contractors to specialized consultants, deserves a robust online presence that not only looks professional but functions as a core driver of growth. His hands-on approach ensures that every project we undertake is tailored to the unique challenges and goals of our clients.
                </p>
                <p>
                  He is committed to delivering transparent, results-oriented solutions that empower business owners to succeed in an increasingly digital world.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission & Values Section */}
      <section className="bg-white/5 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            To empower service-based businesses with streamlined, powerful, and automated digital systems that convert leads, save time, and drive sustainable growth.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-black border-white/10 text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Results-Driven</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-400">
                We focus on measurable outcomes. Your success is our benchmark.
              </CardContent>
            </Card>
            <Card className="bg-black border-white/10 text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Client Partnership</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-400">
                We work with you, not just for you, building lasting relationships.
              </CardContent>
            </Card>
            <Card className="bg-black border-white/10 text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Innovation & Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-400">
                We leverage the latest technology to build smart, automated systems.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Grow Your Business?</h2>
          <p className="text-lg text-gray-400 mb-8">
            Let's discuss how TLUCA Systems can build the digital foundation your business needs to thrive.
          </p>
          <Button asChild size="lg" className="bg-white text-black hover:bg-gray-200 font-semibold">
            <Link href="/onboarding">Get Started Today</Link>
          </Button>
        </div>
      </section>

    </div>
  )
}

export default AboutPage
