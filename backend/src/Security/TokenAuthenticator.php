<?php

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

/**
 * Authentification par jeton "Bearer".
 *
 * Le jeton en clair n'est jamais stocké : la base ne contient que son empreinte SHA-256
 * (voir User::issueApiToken()). Un jeton expiré ou inconnu donne une réponse 401.
 */
class TokenAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    public function __construct(private UserRepository $userRepository)
    {
    }

    public function supports(Request $request): ?bool
    {
        // La connexion elle-même n'envoie pas de jeton.
        return $request->headers->has('Authorization');
    }

    public function authenticate(Request $request): Passport
    {
        $header = (string) $request->headers->get('Authorization');

        if (!str_starts_with($header, 'Bearer ') || strlen($header) <= 7) {
            throw new AuthenticationException('Jeton manquant ou mal formé.');
        }

        $user = $this->userRepository->findOneByValidApiToken(substr($header, 7));

        if (!$user instanceof User) {
            throw new AuthenticationException('Jeton invalide ou expiré.');
        }

        return new SelfValidatingPassport(
            new UserBadge($user->getUserIdentifier(), static fn () => $user)
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null; // la requête continue vers le contrôleur
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        // Avant : retournait null, donc la requête continuait en anonyme.
        return new JsonResponse(['error' => 'Session expirée ou invalide.'], Response::HTTP_UNAUTHORIZED);
    }

    /**
     * Appelé quand une route protégée est demandée sans aucun jeton.
     */
    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new JsonResponse(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
    }
}
