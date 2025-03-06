import { redirect } from 'next/navigation'
import React, { FC, ReactNode } from 'react'
import { getClient } from './_actions/getUser'
import Navbar from './_components/Navbar'

interface LayoutProps {
  children: ReactNode
}

const Template: FC<LayoutProps> = async ({ children }) => {
  const user = await getClient()
  if (!user) {
    redirect('/login')
    return null
  }
  return (
    <div>
      <Navbar />
      {children}
    </div>
  )
}

export default Template
