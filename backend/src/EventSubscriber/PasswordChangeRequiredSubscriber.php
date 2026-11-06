<?php

namespace App\EventSubscriber;

use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class PasswordChangeRequiredSubscriber implements EventSubscriberInterface
{
    public function __construct(private Security $security)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onKernelRequest', 0]];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $route = (string) $request->attributes->get('_route', '');
        if (!str_starts_with($route, 'api_')) {
            return;
        }

        $user = $this->security->getUser();
        if (!$user instanceof User || !$user->mustChangePassword()) {
            return;
        }

        if (in_array($route, ['api_auth_change_password', 'api_auth_logout'], true)) {
            return;
        }

        $event->setResponse(new JsonResponse([
            'error' => 'Vous devez créer un nouveau mot de passe avant de continuer.',
            'mustChangePassword' => true,
        ], JsonResponse::HTTP_FORBIDDEN));
    }
}
