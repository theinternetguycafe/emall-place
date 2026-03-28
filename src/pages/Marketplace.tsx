import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Marketplace as MarketplaceComponent } from '../components/marketplace'

export default function Marketplace() {
  return (
    <>
      <Helmet>
        <title>Marketplace | eMall Place Collective</title>
        <meta name="description" content="Browse products and services from independent South African creators." />
      </Helmet>
      <MarketplaceComponent />
    </>
  )
}
