import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  
  @Get('test')
  @ApiOperation({ summary: 'Test admin access' })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin access confirmed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: { type: 'object' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  adminTest(@Req() req) {
    return {
      message: 'Welcome to Admin Dashboard!',
      user: {
        id: req.user.userId,
        email: req.user.email, 
        role: req.user.role
      },
      adminFeatures: ['User Management', 'System Settings', 'Reports'],
      timestamp: new Date().toISOString()
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard overview' })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        stats: { type: 'object' },
        currentAdmin: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  adminDashboard(@Req() req) {
    return {
      message: 'Admin Dashboard Data',
      stats: {
        totalUsers: 1250,
        activeUsers: 890,
        newRegistrations: 45,
        systemHealth: 'Good'
      },
      currentAdmin: req.user.email,
      lastLogin: new Date().toISOString()
    };
  }
}