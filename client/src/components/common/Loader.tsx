import React from 'react'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse' | 'bounce'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white'
  text?: string
  className?: string
}

const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colorClasses = {
    primary: 'border-primary-600 text-primary-600',
    secondary: 'border-secondary-600 text-secondary-600',
    success: 'border-success-600 text-success-600',
    warning: 'border-warning-600 text-warning-600',
    error: 'border-error-600 text-error-600',
    white: 'border-white text-white'
  }

  const dotSizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  }

  const renderSpinner = () => (
    <div
      className={`${sizeClasses[size]} border-2 border-t-transparent rounded-full animate-spin ${colorClasses[color]} ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )

  const renderDots = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${dotSizeClasses[size]} bg-current rounded-full animate-bounce ${colorClasses[color]}`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )

  const renderPulse = () => (
    <div
      className={`${sizeClasses[size]} bg-current rounded-full animate-pulse-slow ${colorClasses[color]} ${className}`}
    />
  )

  const renderBounce = () => (
    <div
      className={`${sizeClasses[size]} bg-current rounded animate-bounce-gentle ${colorClasses[color]} ${className}`}
    />
  )

  const getLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots()
      case 'pulse':
        return renderPulse()
      case 'bounce':
        return renderBounce()
      default:
        return renderSpinner()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {getLoader()}
      {text && (
        <p className={`text-sm font-medium animate-fade-in ${colorClasses[color]}`}>
          {text}
        </p>
      )}
    </div>
  )
}

export default Loader