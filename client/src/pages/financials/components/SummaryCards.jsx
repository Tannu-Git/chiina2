import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

const SummaryCards = ({ cards = [] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <Card key={index} className={`bg-card ${card.borderColor || ''}`}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-sm font-medium uppercase tracking-wide ${card.titleColor || 'text-muted-foreground'}`}>
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.valueColor || 'text-foreground'}`}>
                  {card.isCurrency ? formatCurrency(card.value) : card.value}
                </p>
                {card.description && (
                  <p className={`text-xs mt-1 ${card.descriptionColor || 'text-muted-foreground'}`}>
                    {card.description}
                  </p>
                )}
              </div>
              {card.icon && (
                <card.icon className={`h-8 w-8 ${card.iconColor || 'text-muted-foreground'}`} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default SummaryCards