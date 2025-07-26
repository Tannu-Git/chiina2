import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Glass Card variant
const GlassCard = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg bg-white/10 backdrop-blur-md border border-white/20 shadow-xl text-white",
      className
    )}
    {...props}
  />
))
GlassCard.displayName = "GlassCard"

// Metric Card for dashboard
const MetricCard = React.forwardRef(({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  className,
  ...props 
}, ref) => (
  <Card ref={ref} className={cn("metric-card", className)} {...props}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="metric-label">{title}</p>
          <p className="metric-value">{value}</p>
          {change && (
            <p className={cn(
              "metric-change",
              changeType === 'positive' && "metric-change-positive",
              changeType === 'negative' && "metric-change-negative"
            )}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
))
MetricCard.displayName = "MetricCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  GlassCard,
  MetricCard
}
