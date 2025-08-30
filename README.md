
# PhoneCommander

Sistema completo de controle remoto de dispositivos Android em tempo real.

## Funcionalidades

- 🎯 **Controle Remoto em Tempo Real**: Controle dispositivos Android remotamente através do painel web
- 📱 **Gerador de APK**: Gere APKs personalizados com configurações específicas do servidor
- 🔄 **Conexão Reversa**: Dispositivos Android se conectam automaticamente ao servidor
- 🌐 **Interface Web Moderna**: Dashboard completo para gerenciamento de dispositivos
- 🔌 **WebSocket + TCP**: Comunicação em tempo real via WebSocket e TCP
- 📊 **Monitoramento**: Visualize status dos dispositivos, bateria, tela, etc.
- ⚙️ **Configuração Flexível**: Suporte para qualquer IP/porta (Replit, VPS, etc.)

## Tecnologias

### Backend
- Node.js + TypeScript
- Express.js para API REST
- WebSocket para comunicação em tempo real
- TCP Server para comunicação com dispositivos Android
- SQLite com Drizzle ORM para persistência

### Frontend
- React + TypeScript
- Vite para build e desenvolvimento
- TanStack Query para gerenciamento de estado
- Tailwind CSS + shadcn/ui para interface
- WebSocket para comunicação em tempo real

### Android
- Java nativo para máxima compatibilidade
- Accessibility Service para controle do dispositivo
- Screen Capture Service para captura de tela
- TCP Client para comunicação com servidor
- Boot Receiver para auto-start

## Instalação e Uso

### 1. Clone o repositório
```bash
git clone https://github.com/maspider2025/PhoneCommander.git
cd PhoneCommander
```

### 2. Instale dependências
```bash
npm install
```

### 3. Execute o projeto
```bash
npm run dev
```

### 4. Acesse o dashboard
- Abra http://localhost:5000 no navegador
- Vá para a aba "APK Generator"
- Configure o servidor (IP/porta)
- Gere o APK personalizado

### 5. Instale no Android
- Baixe o APK gerado
- Instale no dispositivo Android
- Conceda as permissões necessárias
- O dispositivo se conectará automaticamente

## Configuração

### Servidor Local (Replit)
- IP: Domínio automático do Replit
- Porta TCP: 8080 (padrão)
- Porta WebSocket: 5000

### Servidor Externo (VPS)
- Configure IP/porta personalizada no gerador de APK
- Certifique-se que as portas estão abertas no firewall
- Use IP público ou domínio do VPS

## Arquitetura

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Dashboard     │◄──────────────►│   Backend       │
│   (React)       │    HTTP API     │   (Node.js)     │
└─────────────────┘                 └─────────────────┘
                                            │
                                            │ TCP
                                            ▼
                                    ┌─────────────────┐
                                    │ Android Device  │
                                    │ (APK Client)    │
                                    └─────────────────┘
```

## Recursos Implementados

✅ **Backend Completo**
- TCP Server para comunicação com Android
- WebSocket Server para dashboard
- API REST completa
- Gerador de APK em tempo real
- Gerenciamento de dispositivos

✅ **Frontend Completo**
- Dashboard responsivo
- Controle de dispositivos em tempo real
- Gerador de APK integrado
- Visualização de tela do dispositivo
- Gerenciamento de servidor

✅ **Android Client**
- Accessibility Service
- Screen Capture Service
- TCP Client com reconexão automática
- Auto-start no boot
- Suporte a todas versões Android

✅ **Funcionalidades Avançadas**
- Conexão reversa (dispositivo → servidor)
- Configuração dinâmica de IP/porta
- Build de APK em tempo real
- Logs de atividade
- Monitoramento de status

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para mais detalhes.

## Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.
