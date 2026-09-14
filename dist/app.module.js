"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_module_1 = require("./prisma.module");
const auth_service_1 = require("./auth.service");
const freelancers_service_1 = require("./freelancers.service");
const jobs_service_1 = require("./jobs.service");
const requests_service_1 = require("./requests.service");
const socket_registry_1 = require("./socket.registry");
const api_gateway_1 = require("./api.gateway");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.JWT_SECRET || 'codespan-dev-secret-change-in-prod',
                signOptions: { expiresIn: '7d' },
            }),
        ],
        providers: [
            auth_service_1.AuthService,
            freelancers_service_1.FreelancersService,
            jobs_service_1.JobsService,
            requests_service_1.RequestsService,
            socket_registry_1.SocketRegistry,
            api_gateway_1.ApiGateway,
        ],
    })
], AppModule);
