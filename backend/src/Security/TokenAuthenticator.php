<?php

namespace App\Security;

use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class TokenAuthenticator extends AbstractAuthenticator
{
    public function __construct(private UserRepository $userRepository)
    {
    }

    public function supports(Request $request): ?bool
    {
        // N'appliquer l'authentification que si Authorization header est présent
        // Les routes publiques n'ont pas ce header
        return $request->headers->has('Authorization');
    }

    public function authenticate(Request $request): Passport
    {
        $authHeader = $request->headers->get('Authorization');
        
        if (!$authHeader) {
            throw new AuthenticationException('Authorization header missing');
        }

        if (!str_starts_with($authHeader, 'Bearer ')) {
            throw new AuthenticationException('Invalid token format');
        }

        $token = substr($authHeader, 7);

        if (empty($token)) {
            throw new AuthenticationException('Empty token');
        }

        $user = $this->userRepository->findOneBy(['apiToken' => $token]);

        if (!$user) {
            throw new AuthenticationException('Invalid token');
        }

        if (!$user->isActive()) {
            throw new AuthenticationException('User account is disabled');
        }

        // Passer directement le User object pour que Symfony l'utilise avec tous ses rôles
        return new SelfValidatingPassport(
            new UserBadge($user->getUserIdentifier(), function($identifier) use ($user) {
                return $user;
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return null;
    }
}
