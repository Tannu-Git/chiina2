import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useThemeStore } from '@/stores/themeStore'
import {
  Palette,
  Monitor,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Sparkles,
  Zap,
  Settings
} from 'lucide-react'

/**
 * Sidebar Demo Component - Showcases all sidebar features
 */
const SidebarDemo = () => {
  const {
    theme,
    isDark,
    sidebarCollapsed,
    sidebarPinned,
    sidebarStyle,
    compactMode,
    accentColor,
    setTheme,
    toggleSidebar,
    setSidebarPinned,
    setSidebarStyle,
    setCompactMode,
    setAccentColor
  } = useThemeStore()

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ]

  const styleOptions = [
    { value: 'modern', label: 'Modern', description: 'Clean and professional' },
    { value: 'glass', label: 'Glass', description: 'Glassmorphism effect' },
    { value: 'minimal', label: 'Minimal', description: 'Simple and clean' }
  ]

  const accentOptions = [
    { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
    { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
    { value: 'green', label: 'Green', color: 'bg-green-500' },
    { value: 'orange', label: 'Orange', color: 'bg-orange-500' }
  ]

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.h1 
          className="text-3xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🎨 Enhanced Sidebar Demo
        </motion.h1>
        <p className="text-muted-foreground">
          Professional sidebar with responsive design, themes, and advanced features
        </p>
      </div>

      {/* Current Status */}
      <motion.div 
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Sparkles className="mr-2 h-5 w-5 text-primary" />
          Current Configuration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Badge variant="outline" className="mb-2">Theme</Badge>
            <p className="text-sm font-medium">{theme}</p>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="mb-2">Sidebar</Badge>
            <p className="text-sm font-medium">{sidebarCollapsed ? 'Collapsed' : 'Expanded'}</p>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="mb-2">Style</Badge>
            <p className="text-sm font-medium capitalize">{sidebarStyle}</p>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="mb-2">Accent</Badge>
            <p className="text-sm font-medium capitalize">{accentColor}</p>
          </div>
        </div>
      </motion.div>

      {/* Theme Controls */}
      <motion.div 
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Palette className="mr-2 h-5 w-5 text-primary" />
          Theme Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themeOptions.map((option) => (
            <Button
              key={option.value}
              variant={theme === option.value ? "default" : "outline"}
              onClick={() => setTheme(option.value)}
              className="flex items-center justify-center"
            >
              <option.icon className="mr-2 h-4 w-4" />
              {option.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Sidebar Controls */}
      <motion.div 
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="mr-2 h-5 w-5 text-primary" />
          Sidebar Controls
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={toggleSidebar}
            className="flex items-center justify-center"
          >
            {sidebarCollapsed ? <Maximize2 className="mr-2 h-4 w-4" /> : <Minimize2 className="mr-2 h-4 w-4" />}
            {sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar
          </Button>
          <Button
            variant="outline"
            onClick={() => setSidebarPinned(!sidebarPinned)}
            className="flex items-center justify-center"
          >
            {sidebarPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
            {sidebarPinned ? 'Unpin' : 'Pin'} Sidebar
          </Button>
        </div>
      </motion.div>

      {/* Style Options */}
      <motion.div 
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="mr-2 h-5 w-5 text-primary" />
          Sidebar Styles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {styleOptions.map((option) => (
            <div
              key={option.value}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                sidebarStyle === option.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSidebarStyle(option.value)}
            >
              <h4 className="font-medium mb-1">{option.label}</h4>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Accent Colors */}
      <motion.div 
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold mb-4">Accent Colors</h3>
        <div className="flex gap-4">
          {accentOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setAccentColor(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                accentColor === option.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${option.color}`} />
              {option.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Features List */}
      <motion.div 
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h3 className="text-lg font-semibold mb-4">✨ Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p>• 📱 Fully responsive design</p>
            <p>• 🎨 Multiple theme support</p>
            <p>• 🔄 Smooth animations</p>
            <p>• 💻 Laptop-optimized layout</p>
          </div>
          <div className="space-y-2">
            <p>• 🎯 Hover tooltips</p>
            <p>• 📌 Pin/unpin functionality</p>
            <p>• 🌙 Dark/light mode</p>
            <p>• ♿ Accessibility features</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SidebarDemo
