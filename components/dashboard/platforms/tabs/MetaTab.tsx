"use client"

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

// This is a placeholder component - the main Meta functionality has been moved to MetaTab2
// This file can be deleted once MetaTab2 is fully integrated as the main Meta page

export function MetaTab() {
    return (
    <Card className="bg-[#111] border-[#333] text-center py-10">
      <CardContent className="flex flex-col items-center">
        <Image 
          src="https://i.imgur.com/6hyyRrs.png"
          alt="Meta"
          width={48}
          height={48}
          className="mb-4 opacity-50"
        />
        <h3 className="text-xl font-medium text-white mb-2">Legacy Meta Tab</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          This tab has been replaced. The main Meta functionality is now handled by the updated Meta page.
        </p>
      </CardContent>
    </Card>
  );
}
